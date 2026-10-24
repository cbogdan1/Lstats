import type { ChampionStats, Platform, Puuid, SeasonChampions } from '@lol/shared';
import { cache } from './cache.js';
import { PLATFORM_REGIONS, TTL } from './config.js';
import { getMatch, getMatchIds, getRankedEntries, type MatchDto } from './riot.js';

// Riot has no per-champion season endpoint, so the season is crawled match by match, newest
// first, at low priority so normal lookups always go first. A full season can be 1000+ calls.
const PAGE = 100; // MATCH-V5 ids page size limit
const CONCURRENCY = 4;
const ABANDON_MS = 60_000; // stop crawling when no client has polled for this long
const DONE_MS = 10 * 60_000; // recompute a finished season after this long (new games)
const ERROR_RETRY_MS = 30_000;
const SEASON_QUEUES = new Set(['RANKED_SOLO_5x5', 'RANKED_FLEX_SR']);

/** One ranked game reduced to what season stats need; cached instead of the 50 KB match. */
export interface RankedGame {
  championId: number;
  championName: string;
  win: boolean;
  remake: boolean;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
}

export function toRankedGame(match: MatchDto, puuid: Puuid): RankedGame | null {
  const me = match.info.participants.find((p) => p.puuid === puuid);
  if (!me) return null;
  return {
    championId: me.championId,
    championName: me.championName,
    win: me.win,
    remake: me.gameEndedInEarlySurrender,
    kills: me.kills,
    deaths: me.deaths,
    assists: me.assists,
    cs: me.totalMinionsKilled + me.neutralMinionsKilled,
  };
}

export function addGame(stats: Map<number, ChampionStats>, g: RankedGame): void {
  const c = stats.get(g.championId) ?? {
    championId: g.championId,
    championName: g.championName,
    games: 0,
    wins: 0,
    kills: 0,
    deaths: 0,
    assists: 0,
    cs: 0,
  };
  c.games++;
  if (g.win) c.wins++;
  c.kills += g.kills;
  c.deaths += g.deaths;
  c.assists += g.assists;
  c.cs += g.cs;
  stats.set(g.championId, c);
}

export const sortChampions = (stats: Map<number, ChampionStats>): ChampionStats[] =>
  [...stats.values()].sort((a, b) => b.games - a.games || b.wins - a.wins);

async function rankedGame(region: string, matchId: string, puuid: Puuid) {
  const key = `rankedGame:${matchId}:${puuid}`;
  const cached = await cache.get(key);
  if (cached) return JSON.parse(cached) as RankedGame;
  const match = await getMatch(region, matchId, { cacheFull: false, priority: 'low' });
  const game = toRankedGame(match, puuid);
  if (game) await cache.set(key, JSON.stringify(game), TTL.rankedGame);
  return game;
}

interface Job {
  status: SeasonChampions['status'];
  analyzed: number;
  target: number;
  stats: Map<number, ChampionStats>;
  error?: string;
  lastPolled: number;
  finishedAt: number;
}

const jobs = new Map<string, Job>();

async function crawl(key: string, job: Job, platform: Platform, puuid: Puuid): Promise<void> {
  const region = PLATFORM_REGIONS[platform];
  try {
    const entries = await getRankedEntries(platform, puuid);
    job.target = entries
      .filter((e) => SEASON_QUEUES.has(e.queueType))
      .reduce((n, e) => n + e.wins + e.losses, 0);

    for (let start = 0; job.analyzed < job.target; start += PAGE) {
      const ids = await getMatchIds(region, puuid, PAGE, {
        type: 'ranked',
        start,
        priority: 'low',
      });
      for (let i = 0; i < ids.length && job.analyzed < job.target; i += CONCURRENCY) {
        if (Date.now() - job.lastPolled > ABANDON_MS) {
          jobs.delete(key); // nobody is watching; the next poll resumes from the cache
          return;
        }
        const batch = await Promise.allSettled(
          ids.slice(i, i + CONCURRENCY).map((id) => rankedGame(region, id, puuid)),
        );
        for (const r of batch) {
          // Remakes don't count as wins or losses, so they don't count toward the target either.
          if (r.status !== 'fulfilled' || !r.value || r.value.remake) continue;
          if (job.analyzed >= job.target) break;
          addGame(job.stats, r.value);
          job.analyzed++;
        }
      }
      if (ids.length < PAGE) break; // no older ranked games
    }
    job.status = 'done';
  } catch (err) {
    job.status = 'error';
    job.error = err instanceof Error ? err.message : String(err);
  }
  job.finishedAt = Date.now();
}

/** Current state of the season crawl for one player, starting it if needed. */
export function getSeasonChampions(platform: Platform, puuid: Puuid): SeasonChampions {
  const key = `${platform}:${puuid}`;
  const now = Date.now();
  let job = jobs.get(key);
  const expired =
    job &&
    job.status !== 'running' &&
    now - job.finishedAt > (job.status === 'error' ? ERROR_RETRY_MS : DONE_MS);
  if (!job || expired) {
    job = {
      status: 'running',
      analyzed: 0,
      target: 0,
      stats: new Map(),
      lastPolled: now,
      finishedAt: 0,
    };
    jobs.set(key, job);
    void crawl(key, job, platform, puuid);
  }
  job.lastPolled = now;
  return {
    status: job.status,
    analyzed: job.analyzed,
    target: job.target,
    champions: sortChampions(job.stats),
    ...(job.error && { error: job.error }),
  };
}

import type { Account, ChampionMastery, Platform, Puuid, RankedEntry } from '@lol/shared';
import { cache } from './cache.js';
import { config, TTL } from './config.js';
import { RateLimiter, type Priority } from './rateLimiter.js';

// Riot dev key limits. shortcut: one limiter for all routing values (Riot counts per region), split per region when we query several.
// Background season crawls may use 60% of each window; the other 40% stays free for searches.
export const limiter = new RateLimiter(
  [
    { count: 20, windowMs: 1_000 },
    { count: 100, windowMs: 120_000 },
  ],
  0.6,
);

export class RiotError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function fetchRiot<T>(url: string, priority: Priority, retried = false): Promise<T> {
  const res = await fetch(url, { headers: { 'X-Riot-Token': config.riotApiKey } });
  if (res.status === 429 && !retried) {
    limiter.pause(Number(res.headers.get('retry-after') ?? 1) * 1000);
    return limiter.schedule(() => fetchRiot<T>(url, priority, true), priority);
  }
  if (!res.ok)
    throw new RiotError(res.status, `Riot API ${res.status} for ${new URL(url).pathname}`);
  return (await res.json()) as T;
}

/**
 * GET a Riot API path through the Redis cache, then the rate-limited queue.
 * A null cacheKey skips the cache (for data the caller stores in a smaller form itself).
 */
async function riotGet<T>(
  host: string,
  path: string,
  cacheKey: string | null,
  ttlSec: number,
  priority: Priority = 'normal',
): Promise<T> {
  if (!config.riotApiKey) throw new RiotError(503, 'RIOT_API_KEY is not set in apps/proxy/.env');
  const cached = cacheKey && (await cache.get(cacheKey));
  if (cached) return JSON.parse(cached) as T;
  const data = await limiter.schedule(
    () => fetchRiot<T>(`https://${host}.api.riotgames.com${path}`, priority),
    priority,
  );
  if (cacheKey) await cache.set(cacheKey, JSON.stringify(data), ttlSec);
  return data;
}

export function getAccountByRiotId(gameName: string, tagLine: string): Promise<Account> {
  const path = `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  // Riot IDs are case-insensitive.
  const key = `account:${gameName.toLowerCase()}#${tagLine.toLowerCase()}`;
  return riotGet<Account>(config.region, path, key, TTL.account);
}

// Riot response shapes, limited to the fields we read.
export interface SummonerDto {
  puuid: Puuid;
  profileIconId: number;
  summonerLevel: number;
}

type ItemSlot = `item${0 | 1 | 2 | 3 | 4 | 5 | 6}`;

export interface ParticipantDto extends Record<ItemSlot, number> {
  puuid: Puuid;
  riotIdGameName: string;
  riotIdTagline: string;
  championId: number;
  championName: string;
  champLevel: number;
  kills: number;
  deaths: number;
  assists: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  teamPosition: string;
  teamId: number;
  win: boolean;
  gameEndedInEarlySurrender: boolean;
  totalDamageDealtToChampions: number;
  goldEarned: number;
}

export interface MatchDto {
  metadata: { matchId: string };
  info: {
    queueId: number;
    gameStartTimestamp: number;
    gameEndTimestamp?: number;
    gameDuration: number;
    participants: ParticipantDto[];
  };
}

const enc = encodeURIComponent;

export function getSummoner(platform: Platform, puuid: Puuid): Promise<SummonerDto> {
  const path = `/lol/summoner/v4/summoners/by-puuid/${enc(puuid)}`;
  return riotGet(platform, path, `summoner:${platform}:${puuid}`, TTL.summoner);
}

export function getRankedEntries(platform: Platform, puuid: Puuid): Promise<RankedEntry[]> {
  const path = `/lol/league/v4/entries/by-puuid/${enc(puuid)}`;
  return riotGet(platform, path, `rank:${platform}:${puuid}`, TTL.rank);
}

export function getTopMastery(platform: Platform, puuid: Puuid): Promise<ChampionMastery[]> {
  const path = `/lol/champion-mastery/v4/champion-masteries/by-puuid/${enc(puuid)}/top?count=3`;
  return riotGet(platform, path, `mastery:${platform}:${puuid}`, TTL.mastery);
}

export function getMatchIds(
  region: string,
  puuid: Puuid,
  count: number,
  { type, start = 0, priority }: { type?: 'ranked'; start?: number; priority?: Priority } = {},
): Promise<string[]> {
  const filter = type ? `&type=${type}` : '';
  const path = `/lol/match/v5/matches/by-puuid/${enc(puuid)}/ids?start=${start}&count=${count}${filter}`;
  const key = `matchIds:${region}:${puuid}:${start}:${count}:${type ?? 'all'}`;
  return riotGet(region, path, key, TTL.matchIds, priority);
}

export function getMatch(
  region: string,
  matchId: string,
  { cacheFull = true, priority }: { cacheFull?: boolean; priority?: Priority } = {},
): Promise<MatchDto> {
  const path = `/lol/match/v5/matches/${enc(matchId)}`;
  return riotGet(region, path, cacheFull ? `match:${matchId}` : null, TTL.match, priority);
}

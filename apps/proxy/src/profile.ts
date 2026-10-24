import type {
  MatchDetails,
  MatchSummary,
  Platform,
  PlayerMatchStats,
  PlayerProfile,
  Puuid,
  RankedEntry,
} from '@lol/shared';
import { isPlatform, PLATFORM_REGIONS } from './config.js';
import {
  getAccountByRiotId,
  getMatch,
  getMatchIds,
  getRankedEntries,
  getSummoner,
  getTopMastery,
  RiotError,
  type MatchDto,
  type ParticipantDto,
} from './riot.js';

// 1 account + 1 summoner + 1 rank + 1 mastery + 1 ids + 10 matches = 15 calls uncached.
const MATCH_COUNT = 10;
const ITEM_SLOTS = [0, 1, 2, 3, 4, 5, 6] as const;

function playerStats(p: ParticipantDto): PlayerMatchStats {
  return {
    championId: p.championId,
    championName: p.championName,
    champLevel: p.champLevel,
    kills: p.kills,
    deaths: p.deaths,
    assists: p.assists,
    cs: p.totalMinionsKilled + p.neutralMinionsKilled,
    items: ITEM_SLOTS.map((slot) => p[`item${slot}`]),
    position: p.teamPosition,
    win: p.win,
  };
}

/** Riot returns extra fields (puuid, leagueId, ...); keep only what we show. */
function toRankedEntry({
  queueType,
  tier,
  rank,
  leaguePoints,
  wins,
  losses,
}: RankedEntry): RankedEntry {
  return { queueType, tier, rank, leaguePoints, wins, losses };
}

/** Solo/Duo if the player has it, otherwise Flex. */
function bestRank(entries: RankedEntry[]): RankedEntry | null {
  const entry =
    entries.find((e) => e.queueType === 'RANKED_SOLO_5x5') ??
    entries.find((e) => e.queueType === 'RANKED_FLEX_SR');
  return entry ? toRankedEntry(entry) : null;
}

/** Reduce a full MATCH-V5 match to what the profile page shows, from `puuid`'s side. */
export function toMatchSummary(match: MatchDto, puuid: Puuid): MatchSummary | null {
  const { info } = match;
  const me = info.participants.find((p) => p.puuid === puuid);
  if (!me) return null;
  const teamKills = info.participants
    .filter((p) => p.teamId === me.teamId)
    .reduce((n, p) => n + p.kills, 0);
  return {
    ...playerStats(me),
    matchId: match.metadata.matchId,
    queueId: info.queueId,
    startedAt: info.gameStartTimestamp,
    // Matches before patch 11.20 have no gameEndTimestamp and report gameDuration in ms.
    durationSec: info.gameEndTimestamp ? info.gameDuration : Math.round(info.gameDuration / 1000),
    remake: me.gameEndedInEarlySurrender,
    killParticipation: teamKills ? (me.kills + me.assists) / teamKills : 0,
    players: info.participants.map((p) => ({
      gameName: p.riotIdGameName,
      tagLine: p.riotIdTagline,
      championId: p.championId,
      championName: p.championName,
      teamId: p.teamId,
    })),
  };
}

/** Replace Riot's raw 404 message with one a player understands. */
const notFound = (message: string) => (err: unknown) => {
  throw err instanceof RiotError && err.status === 404 ? new RiotError(404, message) : err;
};

export async function getProfile(
  platform: Platform,
  gameName: string,
  tagLine: string,
): Promise<PlayerProfile> {
  const account = await getAccountByRiotId(gameName, tagLine).catch(
    notFound(`No player named ${gameName}#${tagLine}. Check the name and tag.`),
  );
  const { puuid } = account;
  const region = PLATFORM_REGIONS[platform];

  const summoner = await getSummoner(platform, puuid).catch(
    notFound(
      `${account.gameName}#${account.tagLine} has no League profile on this server. Try another region.`,
    ),
  );
  const [ranked, mastery, matchIds] = await Promise.all([
    getRankedEntries(platform, puuid),
    getTopMastery(platform, puuid),
    getMatchIds(region, puuid, MATCH_COUNT),
  ]);
  // One broken match must not hide the whole history.
  const matches = await Promise.allSettled(matchIds.map((id) => getMatch(region, id)));

  return {
    account,
    platform,
    summonerLevel: summoner.summonerLevel,
    profileIconId: summoner.profileIconId,
    ranked: ranked.map(toRankedEntry),
    topMastery: mastery.map(({ championId, championLevel, championPoints }) => ({
      championId,
      championLevel,
      championPoints,
    })),
    matches: matches.flatMap((result, i) => {
      if (result.status === 'rejected') {
        console.warn(`[profile] skipped match ${matchIds[i]}: ${String(result.reason)}`);
        return [];
      }
      return toMatchSummary(result.value, puuid) ?? [];
    }),
  };
}

/**
 * All 10 players of one match with their current rank. Costs one LEAGUE-V4 call per player
 * (cached), so the web app only requests it when a match is expanded.
 */
export async function getMatchDetails(matchId: string): Promise<MatchDetails> {
  // Match ids start with their platform: "EUN1_4019027543".
  const platform = matchId.slice(0, matchId.indexOf('_')).toLowerCase();
  if (!isPlatform(platform)) throw new RiotError(400, `Unknown server in match id ${matchId}`);
  const { info } = await getMatch(PLATFORM_REGIONS[platform], matchId).catch(
    notFound('This match no longer exists.'),
  );
  // A missing rank (bot, rate limit) shows as unranked rather than failing the whole match.
  const ranks = await Promise.all(
    info.participants.map((p) => getRankedEntries(platform, p.puuid).then(bestRank, () => null)),
  );
  return {
    matchId,
    participants: info.participants.map((p, i) => ({
      ...playerStats(p),
      gameName: p.riotIdGameName,
      tagLine: p.riotIdTagline,
      teamId: p.teamId,
      damage: p.totalDamageDealtToChampions,
      gold: p.goldEarned,
      rank: ranks[i] ?? null,
    })),
  };
}

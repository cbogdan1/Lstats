import type { MatchSummary, Platform, PlayerProfile, Puuid } from '@lol/shared';
import { PLATFORM_REGIONS } from './config.js';
import {
  getAccountByRiotId,
  getMatch,
  getMatchIds,
  getRankedEntries,
  getSummoner,
  getTopMastery,
  RiotError,
  type MatchDto,
} from './riot.js';

// 1 account + 1 summoner + 1 rank + 1 mastery + 1 ids + 10 matches = 15 calls uncached.
const MATCH_COUNT = 10;
const ITEM_SLOTS = [0, 1, 2, 3, 4, 5, 6] as const;

/** Reduce a full MATCH-V5 match to what the profile page shows, from `puuid`'s side. */
export function toMatchSummary(match: MatchDto, puuid: Puuid): MatchSummary | null {
  const { info } = match;
  const me = info.participants.find((p) => p.puuid === puuid);
  if (!me) return null;
  return {
    matchId: match.metadata.matchId,
    queueId: info.queueId,
    startedAt: info.gameStartTimestamp,
    // Matches before patch 11.20 have no gameEndTimestamp and report gameDuration in ms.
    durationSec: info.gameEndTimestamp ? info.gameDuration : Math.round(info.gameDuration / 1000),
    win: me.win,
    remake: me.gameEndedInEarlySurrender,
    championId: me.championId,
    championName: me.championName,
    champLevel: me.champLevel,
    kills: me.kills,
    deaths: me.deaths,
    assists: me.assists,
    cs: me.totalMinionsKilled + me.neutralMinionsKilled,
    items: ITEM_SLOTS.map((slot) => me[`item${slot}`]),
    position: me.teamPosition,
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
    ranked: ranked.map(({ queueType, tier, rank, leaguePoints, wins, losses }) => ({
      queueType,
      tier,
      rank,
      leaguePoints,
      wins,
      losses,
    })),
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

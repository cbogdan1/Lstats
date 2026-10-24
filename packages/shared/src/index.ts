// Types only: consumers must use `import type`, so nothing from here exists at runtime.

/** Riot's primary player identifier (encrypted, stable across name changes). */
export type Puuid = string;

/** Riot ID, displayed as `gameName#tagLine`. Replaces Summoner Names. */
export interface RiotId {
  gameName: string;
  tagLine: string;
}

/** ACCOUNT-V1 /riot/account/v1/accounts/by-riot-id response. */
export interface Account extends RiotId {
  puuid: Puuid;
}

/** Values of LCU /lol-gameflow/v1/gameflow-phase. */
export type GameflowPhase =
  | 'None'
  | 'Lobby'
  | 'Matchmaking'
  | 'CheckedIntoTournament'
  | 'ReadyCheck'
  | 'ChampSelect'
  | 'GameStart'
  | 'FailedToLaunch'
  | 'InProgress'
  | 'Reconnect'
  | 'WaitingForStats'
  | 'PreEndOfGame'
  | 'EndOfGame'
  | 'TerminatedInError';

export type Team = 'ORDER' | 'CHAOS';

/** The subset of Live Client Data `allPlayers[]` we read: identity and champion only. */
export interface LivePlayer {
  riotIdGameName: string;
  riotIdTagLine: string;
  championName: string;
  team: Team;
}

/** Live Client Data /liveclientdata/allgamedata (fields we use). */
export interface LiveGameData {
  allPlayers: LivePlayer[];
}

export interface RankedEntry {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
}

/** Platform routing values: the League server a profile lives on. */
export type Platform =
  | 'br1'
  | 'eun1'
  | 'euw1'
  | 'jp1'
  | 'kr'
  | 'la1'
  | 'la2'
  | 'me1'
  | 'na1'
  | 'oc1'
  | 'ru'
  | 'sg2'
  | 'tr1'
  | 'tw2'
  | 'vn2';

export interface ChampionMastery {
  championId: number;
  championLevel: number;
  championPoints: number;
}

export interface MatchPlayer extends RiotId {
  championId: number;
  championName: string;
  teamId: number;
}

/** One player's end-of-game numbers. */
export interface PlayerMatchStats {
  championId: number;
  championName: string;
  champLevel: number;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  items: number[]; // 7 slots, 0 = empty, last one is the trinket
  position: string; // TOP | JUNGLE | MIDDLE | BOTTOM | UTILITY | ''
  win: boolean;
}

/** One match from the searched player's point of view. */
export interface MatchSummary extends PlayerMatchStats {
  matchId: string;
  queueId: number;
  startedAt: number; // epoch ms
  durationSec: number;
  remake: boolean;
  killParticipation: number; // 0..1 share of team kills
  players: MatchPlayer[];
}

/** One of the 10 players in proxy GET /match/:matchId. */
export interface MatchParticipant extends PlayerMatchStats, RiotId {
  teamId: number;
  damage: number; // to champions
  gold: number;
  /** Current Solo/Duo rank (Flex if no Solo), not the rank at match time. */
  rank: RankedEntry | null;
}

export interface MatchDetails {
  matchId: string;
  participants: MatchParticipant[];
}

/** Totals for one champion across the sampled ranked games. */
export interface ChampionStats {
  championId: number;
  championName: string;
  games: number;
  wins: number;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
}

/**
 * Proxy GET /season-champions/:platform/:puuid response. The proxy analyzes the season in the
 * background, so clients poll while `status` is 'running'; `champions` grows as it goes.
 */
export interface SeasonChampions {
  status: 'running' | 'done' | 'error';
  analyzed: number; // ranked games counted so far (remakes excluded)
  target: number; // ranked games this season (Solo/Duo + Flex wins + losses)
  champions: ChampionStats[]; // most played first
  error?: string;
}

/** Proxy GET /profile/:platform/:gameName/:tagLine response. */
export interface PlayerProfile {
  account: Account;
  platform: Platform;
  summonerLevel: number;
  profileIconId: number;
  ranked: RankedEntry[];
  topMastery: ChampionMastery[];
  matches: MatchSummary[];
}

/** One of the 10 player cards on the loading-screen scouting dashboard. */
export interface PlayerCard {
  riotId: RiotId;
  puuid: Puuid;
  team: Team;
  championName: string;
  summonerLevel?: number;
  ranked?: RankedEntry[];
  championMasteryPoints?: number;
  recentMatches?: {
    matchId: string;
    win: boolean;
    kills: number;
    deaths: number;
    assists: number;
  }[];
}

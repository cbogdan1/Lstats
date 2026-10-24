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

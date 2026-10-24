import { after, beforeEach, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import type { ChampionStats } from '@lol/shared';
import { cache, redis } from './cache.js';
import { config } from './config.js';
import type { MatchDto } from './riot.js';
import {
  addGame,
  getSeasonChampions,
  sortChampions,
  toRankedGame,
  type RankedGame,
} from './season.js';

after(() => redis.disconnect());

const PUUID = 'p'.repeat(78);

function rankedMatch(id: string, champion: [number, string], win: boolean, remake = false) {
  return {
    metadata: { matchId: id },
    info: {
      queueId: 420,
      gameStartTimestamp: 0,
      gameEndTimestamp: 1,
      gameDuration: 1800,
      participants: [
        {
          puuid: PUUID,
          riotIdGameName: 'me',
          riotIdTagline: 'EUNE',
          championId: champion[0],
          championName: champion[1],
          champLevel: 15,
          kills: 5,
          deaths: 2,
          assists: 7,
          totalMinionsKilled: 150,
          neutralMinionsKilled: 10,
          teamPosition: 'MIDDLE',
          teamId: 100,
          win,
          gameEndedInEarlySurrender: remake,
          totalDamageDealtToChampions: 0,
          goldEarned: 0,
          item0: 0,
          item1: 0,
          item2: 0,
          item3: 0,
          item4: 0,
          item5: 0,
          item6: 0,
        },
      ],
    },
  } satisfies MatchDto;
}

test('toRankedGame + addGame + sortChampions total a season per champion', () => {
  const games = [
    rankedMatch('A', [1, 'Ahri'], true),
    rankedMatch('B', [2, 'Zed'], false),
    rankedMatch('C', [1, 'Ahri'], false),
  ].map((m) => toRankedGame(m, PUUID)!);
  const stats = new Map<number, ChampionStats>();
  games.forEach((g: RankedGame) => addGame(stats, g));
  assert.deepEqual(
    sortChampions(stats).map((c) => [c.championName, c.games, c.wins, c.kills, c.cs]),
    [
      ['Ahri', 2, 1, 10, 320],
      ['Zed', 1, 0, 5, 160],
    ],
  );
  assert.equal(toRankedGame(rankedMatch('D', [1, 'Ahri'], true), 'someone-else'), null);
});

beforeEach(() => {
  config.riotApiKey = 'test-key';
  mock.method(cache, 'get', async () => null);
  mock.method(cache, 'set', async () => {});
});

test('crawls ranked games until it has counted every win and loss of the season', async () => {
  const matches = {
    EUN1_4: rankedMatch('EUN1_4', [1, 'Ahri'], true),
    EUN1_3: rankedMatch('EUN1_3', [1, 'Ahri'], false, true), // remake: not counted
    EUN1_2: rankedMatch('EUN1_2', [2, 'Zed'], false),
    EUN1_1: rankedMatch('EUN1_1', [1, 'Ahri'], true),
    EUN1_0: rankedMatch('EUN1_0', [3, 'Lux'], true), // last season: beyond the target
  };
  const requested: string[] = [];
  mock.method(globalThis, 'fetch', async (url: string) => {
    const { pathname, search } = new URL(url);
    requested.push(pathname + search);
    let body: unknown;
    if (pathname.includes('/league/v4/entries/')) {
      body = [
        {
          queueType: 'RANKED_SOLO_5x5',
          tier: 'GOLD',
          rank: 'I',
          leaguePoints: 0,
          wins: 2,
          losses: 1,
        },
      ];
    } else if (pathname.endsWith('/ids')) {
      body = Object.keys(matches);
    } else {
      body = matches[pathname.split('/').pop() as keyof typeof matches];
    }
    return new Response(JSON.stringify(body), { status: 200 });
  });

  let result = getSeasonChampions('eun1', PUUID);
  assert.equal(result.status, 'running');
  for (let i = 0; i < 100 && result.status === 'running'; i++) {
    await new Promise((r) => setTimeout(r, 5));
    result = getSeasonChampions('eun1', PUUID);
  }

  assert.equal(result.status, 'done');
  assert.equal(result.target, 3);
  assert.equal(result.analyzed, 3);
  assert.deepEqual(
    result.champions.map((c) => [c.championName, c.games, c.wins]),
    [
      ['Ahri', 2, 2],
      ['Zed', 1, 0],
    ],
  );
  assert.ok(requested.some((r) => r.includes('/ids?start=0&count=100&type=ranked')));
  assert.ok(!requested.some((r) => r.endsWith('/EUN1_0')), 'stops once the season is counted');
});

import { after, beforeEach, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { cache, redis } from './cache.js';
import { config } from './config.js';
import { getMatchDetails, getProfile, toMatchSummary } from './profile.js';
import type { MatchDto, ParticipantDto } from './riot.js';

after(() => redis.disconnect());

function participant(puuid: string, overrides: Partial<ParticipantDto> = {}): ParticipantDto {
  return {
    puuid,
    riotIdGameName: `name-${puuid}`,
    riotIdTagline: 'EUNE',
    championId: 246,
    championName: 'Qiyana',
    champLevel: 16,
    kills: 7,
    deaths: 2,
    assists: 5,
    totalMinionsKilled: 180,
    neutralMinionsKilled: 20,
    teamPosition: 'MIDDLE',
    teamId: 100,
    win: true,
    gameEndedInEarlySurrender: false,
    totalDamageDealtToChampions: 20_000,
    goldEarned: 12_000,
    item0: 1,
    item1: 2,
    item2: 0,
    item3: 0,
    item4: 0,
    item5: 0,
    item6: 3364,
    ...overrides,
  };
}

function match(id: string, participants: ParticipantDto[], info: Partial<MatchDto['info']> = {}) {
  return {
    metadata: { matchId: id },
    info: {
      queueId: 420,
      gameStartTimestamp: 1_700_000_000_000,
      gameEndTimestamp: 1_700_001_800_000,
      gameDuration: 1800,
      participants,
      ...info,
    },
  } satisfies MatchDto;
}

test('toMatchSummary reports the match from the given player side', () => {
  const m = match('EUN1_1', [participant('me'), participant('foe', { teamId: 200, win: false })]);
  const s = toMatchSummary(m, 'me')!;
  assert.equal(s.win, true);
  assert.equal(s.cs, 200);
  assert.deepEqual(s.items, [1, 2, 0, 0, 0, 0, 3364]);
  assert.equal(s.durationSec, 1800);
  assert.equal(s.position, 'MIDDLE');
  assert.deepEqual(
    s.players.map((p) => [p.gameName, p.teamId]),
    [
      ['name-me', 100],
      ['name-foe', 200],
    ],
  );
  assert.equal(toMatchSummary(m, 'stranger'), null);
});

test('toMatchSummary computes kill participation from the player team only', () => {
  const m = match('EUN1_3', [
    participant('me', { kills: 3, assists: 3 }),
    participant('ally', { kills: 9 }),
    participant('foe', { teamId: 200, kills: 50 }),
  ]);
  assert.equal(toMatchSummary(m, 'me')!.killParticipation, 0.5); // (3+3) / (3+9)
});

test('toMatchSummary converts pre-11.20 durations from ms', () => {
  const old = match('EUN1_2', [participant('me')], {
    gameEndTimestamp: undefined,
    gameDuration: 1_800_000,
  });
  assert.equal(toMatchSummary(old, 'me')!.durationSec, 1800);
});

// --- getProfile against a fake Riot API ---

type Routes = Record<string, { status?: number; body?: unknown }>;
let routes: Routes;

beforeEach(() => {
  config.riotApiKey = 'test-key';
  mock.method(cache, 'get', async () => null);
  mock.method(cache, 'set', async () => {});
  mock.method(globalThis, 'fetch', async (url: string) => {
    const path = new URL(url).pathname;
    const route = routes[path] ?? { status: 404 };
    return new Response(JSON.stringify(route.body ?? {}), { status: route.status ?? 200 });
  });
});

const ACCOUNT = '/riot/account/v1/accounts/by-riot-id/Faker/KR1';
const base = (): Routes => ({
  [ACCOUNT]: { body: { puuid: 'me', gameName: 'Faker', tagLine: 'KR1' } },
  '/lol/summoner/v4/summoners/by-puuid/me': {
    body: { puuid: 'me', profileIconId: 7, summonerLevel: 300 },
  },
  '/lol/league/v4/entries/by-puuid/me': {
    body: [
      {
        queueType: 'RANKED_SOLO_5x5',
        tier: 'GOLD',
        rank: 'II',
        leaguePoints: 50,
        wins: 10,
        losses: 5,
        puuid: 'me',
      },
    ],
  },
  '/lol/champion-mastery/v4/champion-masteries/by-puuid/me/top': {
    body: [{ championId: 246, championLevel: 9, championPoints: 1000, puuid: 'me' }],
  },
  '/lol/match/v5/matches/by-puuid/me/ids': { body: ['M1', 'M2'] },
  '/lol/match/v5/matches/M1': { body: match('M1', [participant('me')]) },
  '/lol/match/v5/matches/M2': { status: 500 },
});

test('getProfile combines level, rank, mastery and matches, skipping a failed match', async () => {
  routes = base();
  mock.method(console, 'warn', () => {});
  const p = await getProfile('eun1', 'Faker', 'KR1');
  assert.equal(p.summonerLevel, 300);
  assert.deepEqual(p.ranked, [
    {
      queueType: 'RANKED_SOLO_5x5',
      tier: 'GOLD',
      rank: 'II',
      leaguePoints: 50,
      wins: 10,
      losses: 5,
    },
  ]);
  assert.deepEqual(p.topMastery, [{ championId: 246, championLevel: 9, championPoints: 1000 }]);
  assert.deepEqual(
    p.matches.map((m) => m.matchId),
    ['M1'],
  );
});

test('getProfile explains unknown Riot IDs and wrong servers', async () => {
  routes = { ...base(), [ACCOUNT]: { status: 404 } };
  await assert.rejects(getProfile('eun1', 'Faker', 'KR1'), /No player named Faker#KR1/);

  routes = { ...base(), '/lol/summoner/v4/summoners/by-puuid/me': { status: 404 } };
  await assert.rejects(getProfile('eun1', 'Faker', 'KR1'), /no League profile on this server/);
});

test('getMatchDetails adds each player current rank, preferring Solo/Duo over Flex', async () => {
  const entry = (queueType: string, tier: string) => ({
    queueType,
    tier,
    rank: 'I',
    leaguePoints: 10,
    wins: 1,
    losses: 1,
    leagueId: 'x',
  });
  routes = {
    '/lol/match/v5/matches/EUN1_9': {
      body: match('EUN1_9', [
        participant('a'),
        participant('b', { teamId: 200 }),
        participant('c', { teamId: 200 }),
        participant('BOT', { teamId: 200 }),
      ]),
    },
    '/lol/league/v4/entries/by-puuid/a': {
      body: [entry('RANKED_FLEX_SR', 'SILVER'), entry('RANKED_SOLO_5x5', 'GOLD')],
    },
    '/lol/league/v4/entries/by-puuid/b': { body: [entry('RANKED_FLEX_SR', 'IRON')] },
    '/lol/league/v4/entries/by-puuid/c': { body: [] },
    // 'BOT' has no route: the fake API answers 404, which must not fail the match.
  };
  const d = await getMatchDetails('EUN1_9');
  assert.deepEqual(
    d.participants.map((p) => p.rank?.tier ?? null),
    ['GOLD', 'IRON', null, null],
  );
  assert.equal('leagueId' in d.participants[0]!.rank!, false);
  assert.equal(d.participants[0]!.damage, 20_000);
});

test('getMatchDetails rejects match ids from unknown servers', async () => {
  routes = {};
  await assert.rejects(getMatchDetails('XX9_1'), /Unknown server/);
  await assert.rejects(getMatchDetails('EUN1_404'), /no longer exists/);
});

import { mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchProfile, isPlatform, parseRiotId } from './api';

test('parseRiotId splits on the last # and enforces Riot length limits', () => {
  assert.deepEqual(parseRiotId(' Hide on bush#KR1 '), { gameName: 'Hide on bush', tagLine: 'KR1' });
  assert.deepEqual(parseRiotId('a#b#EUNE'), { gameName: 'a#b', tagLine: 'EUNE' });
  assert.equal(parseRiotId('NoTag'), null);
  assert.equal(parseRiotId('ab#EUNE'), null); // name too short
  assert.equal(parseRiotId('Seventeen chars!!#EUNE'), null); // name too long
  assert.equal(parseRiotId('Name#EU'), null); // tag too short
  assert.equal(parseRiotId('Name#TOOLONG'), null);
});

test('isPlatform accepts only known servers', () => {
  assert.equal(isPlatform('eun1'), true);
  assert.equal(isPlatform('xx1'), false);
  assert.equal(isPlatform('toString'), false);
  assert.equal(isPlatform(null), false);
});

test('fetchProfile builds an encoded URL and surfaces proxy error messages', async () => {
  const calls: string[] = [];
  mock.method(globalThis, 'fetch', async (url: string) => {
    calls.push(url);
    return new Response(JSON.stringify({ error: 'No player named X' }), { status: 404 });
  });
  await assert.rejects(
    fetchProfile('eun1', { gameName: 'Hide on bush', tagLine: 'KR1' }, 'http://api'),
    /No player named X/,
  );
  assert.deepEqual(calls, ['http://api/profile/eun1/Hide%20on%20bush/KR1']);
  mock.restoreAll();
});

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import { localGetJson } from './local';
import { sendJson, startFakeServer } from './fakeLocalServer';

let fake: Awaited<ReturnType<typeof startFakeServer>>;
let lastAuth: string | undefined;

before(async () => {
  fake = await startFakeServer((req, res) => {
    lastAuth = req.headers.authorization;
    if (req.url === '/ok') return sendJson(res, { hello: 'world' });
    if (req.url === '/broken') return res.writeHead(200).end('not json');
    sendJson(res, { error: 'nope' }, 404);
  });
});
after(() => fake.close());

test('refuses any host other than 127.0.0.1', async () => {
  await assert.rejects(localGetJson('https://example.com/x'), /non-local/);
  await assert.rejects(localGetJson('https://localhost:2999/x'), /non-local/);
  await assert.rejects(localGetJson('https://127.0.0.1.evil.com/x'), /non-local/);
});

test('accepts the self-signed cert on 127.0.0.1 and parses JSON', async () => {
  assert.deepEqual(await localGetJson(`https://127.0.0.1:${fake.port}/ok`), { hello: 'world' });
});

test('sends the Authorization header only when given', async () => {
  await localGetJson(`https://127.0.0.1:${fake.port}/ok`, 'Basic abc');
  assert.equal(lastAuth, 'Basic abc');
  await localGetJson(`https://127.0.0.1:${fake.port}/ok`);
  assert.equal(lastAuth, undefined);
});

test('rejects non-200 responses and invalid JSON', async () => {
  await assert.rejects(localGetJson(`https://127.0.0.1:${fake.port}/missing`), /404/);
  await assert.rejects(localGetJson(`https://127.0.0.1:${fake.port}/broken`), SyntaxError);
});

test('does not disable TLS verification globally', async () => {
  const err = await new Promise<Error>((resolve) => {
    https
      .get(`https://127.0.0.1:${fake.port}/ok`, () => resolve(new Error('accepted')))
      .on('error', resolve);
  });
  assert.match(err.message, /self[- ]signed|certificate/i);
});

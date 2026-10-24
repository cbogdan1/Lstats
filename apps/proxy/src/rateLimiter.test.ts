import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { RateLimiter } from './rateLimiter.js';

test('queues calls beyond every window and releases them in order', () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  try {
    const limiter = new RateLimiter([
      { count: 2, windowMs: 1000 },
      { count: 3, windowMs: 10_000 },
    ]);
    const started: number[] = [];
    for (let i = 0; i < 5; i++) void limiter.schedule(async () => void started.push(i));

    assert.deepEqual(started, [0, 1]); // short window full
    mock.timers.tick(1000);
    assert.deepEqual(started, [0, 1, 2]); // long window now full
    mock.timers.tick(8999);
    assert.deepEqual(started, [0, 1, 2]);
    mock.timers.tick(1);
    assert.deepEqual(started, [0, 1, 2, 3, 4]);
  } finally {
    mock.timers.reset();
  }
});

test('pause blocks new calls until it expires', () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  try {
    const limiter = new RateLimiter([{ count: 10, windowMs: 1000 }]);
    limiter.pause(500);
    let ran = false;
    void limiter.schedule(async () => void (ran = true));
    mock.timers.tick(499);
    assert.equal(ran, false);
    mock.timers.tick(1);
    assert.equal(ran, true);
  } finally {
    mock.timers.reset();
  }
});

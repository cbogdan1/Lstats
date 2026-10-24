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

test('normal calls start before queued low-priority calls', () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  try {
    const limiter = new RateLimiter([{ count: 1, windowMs: 1000 }]);
    const started: string[] = [];
    void limiter.schedule(async () => void started.push('first'));
    void limiter.schedule(async () => void started.push('crawl-1'), 'low');
    void limiter.schedule(async () => void started.push('crawl-2'), 'low');
    void limiter.schedule(async () => void started.push('user'));
    assert.equal(limiter.pending, 3);
    mock.timers.tick(1000);
    mock.timers.tick(1000);
    mock.timers.tick(1000);
    assert.deepEqual(started, ['first', 'user', 'crawl-1', 'crawl-2']);
  } finally {
    mock.timers.reset();
  }
});

test('low-priority calls leave the rest of each window free for normal calls', () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  try {
    const limiter = new RateLimiter([{ count: 10, windowMs: 1000 }], 0.6);
    let crawled = 0;
    for (let i = 0; i < 20; i++) void limiter.schedule(async () => void crawled++, 'low');
    assert.equal(crawled, 6); // 60% of the window
    let user = false;
    void limiter.schedule(async () => void (user = true));
    assert.equal(user, true); // starts immediately from the reserved share
    mock.timers.tick(1000);
    assert.equal(crawled, 12);
  } finally {
    mock.timers.reset();
  }
});

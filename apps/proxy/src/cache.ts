import { Redis } from 'ioredis';
import { config } from './config.js';

// Fail fast instead of queueing while Redis is down; callers fall through to Riot.
export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
});

let warned = false;
redis.on('error', (err: NodeJS.ErrnoException) => {
  // Connection failures arrive as an AggregateError with an empty message but a code.
  if (!warned)
    console.warn(`[redis] ${err.code ?? err.message} (caching disabled until it reconnects)`);
  warned = true;
});
redis.on('ready', () => (warned = false));

// An object (not bare exports) so tests can stub it with mock.method.
export const cache = {
  async get(key: string): Promise<string | null> {
    try {
      return await redis.get(key);
    } catch {
      return null;
    }
  },

  async set(key: string, value: string, ttlSec: number): Promise<void> {
    try {
      await redis.set(key, value, 'EX', ttlSec);
    } catch {
      // Cache is best-effort.
    }
  },
};

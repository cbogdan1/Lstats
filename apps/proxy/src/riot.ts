import type { Account } from '@lol/shared';
import { cache } from './cache.js';
import { config, TTL } from './config.js';
import { RateLimiter } from './rateLimiter.js';

// Riot dev key limits. shortcut: one limiter for all routing values (Riot counts per region), split per region when we query several.
export const limiter = new RateLimiter([
  { count: 20, windowMs: 1_000 },
  { count: 100, windowMs: 120_000 },
]);

export class RiotError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function fetchRiot<T>(url: string, retried = false): Promise<T> {
  const res = await fetch(url, { headers: { 'X-Riot-Token': config.riotApiKey } });
  if (res.status === 429 && !retried) {
    limiter.pause(Number(res.headers.get('retry-after') ?? 1) * 1000);
    return limiter.schedule(() => fetchRiot<T>(url, true));
  }
  if (!res.ok)
    throw new RiotError(res.status, `Riot API ${res.status} for ${new URL(url).pathname}`);
  return (await res.json()) as T;
}

/** GET a Riot API path through the Redis cache, then the rate-limited queue. */
async function riotGet<T>(
  host: string,
  path: string,
  cacheKey: string,
  ttlSec: number,
): Promise<T> {
  if (!config.riotApiKey) throw new RiotError(503, 'RIOT_API_KEY is not set in apps/proxy/.env');
  const cached = await cache.get(cacheKey);
  if (cached) return JSON.parse(cached) as T;
  const data = await limiter.schedule(() =>
    fetchRiot<T>(`https://${host}.api.riotgames.com${path}`),
  );
  await cache.set(cacheKey, JSON.stringify(data), ttlSec);
  return data;
}

export function getAccountByRiotId(gameName: string, tagLine: string): Promise<Account> {
  const path = `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  // Riot IDs are case-insensitive.
  const key = `account:${gameName.toLowerCase()}#${tagLine.toLowerCase()}`;
  return riotGet<Account>(config.region, path, key, TTL.account);
}

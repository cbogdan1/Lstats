import type { Platform } from '@lol/shared';

try {
  process.loadEnvFile();
} catch {
  // No .env file: rely on real environment variables.
}

export const config = {
  riotApiKey: process.env.RIOT_API_KEY ?? '',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  port: Number(process.env.PORT ?? 3001),
  platform: process.env.RIOT_PLATFORM ?? 'eun1',
  region: process.env.RIOT_REGION ?? 'europe',
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
};

/** Platform -> regional routing value for ACCOUNT-V1 / MATCH-V5. */
export const PLATFORM_REGIONS: Record<Platform, 'americas' | 'asia' | 'europe' | 'sea'> = {
  na1: 'americas',
  br1: 'americas',
  la1: 'americas',
  la2: 'americas',
  eun1: 'europe',
  euw1: 'europe',
  tr1: 'europe',
  ru: 'europe',
  me1: 'europe',
  kr: 'asia',
  jp1: 'asia',
  oc1: 'sea',
  sg2: 'sea',
  tw2: 'sea',
  vn2: 'sea',
};

/** Cache TTLs in seconds. */
export const TTL = {
  account: 60 * 60 * 24 * 7, // Riot ID -> PUUID changes only on rename
  summoner: 60 * 60,
  rank: 60 * 10,
  mastery: 60 * 60,
  matchIds: 60 * 2,
  match: 60 * 60 * 24 * 30, // finished matches are immutable
};

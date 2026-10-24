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

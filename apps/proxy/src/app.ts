import cors from '@fastify/cors';
import Fastify, { type FastifyServerOptions } from 'fastify';
import type { Platform, RiotId } from '@lol/shared';
import { redis } from './cache.js';
import { config, PLATFORM_REGIONS } from './config.js';
import { getProfile } from './profile.js';
import { getAccountByRiotId, limiter, RiotError } from './riot.js';

export async function buildApp(opts: FastifyServerOptions = { logger: true }) {
  const app = Fastify(opts);
  // Only the Lstats web app may call the proxy from a browser; the desktop app calls from Node.
  await app.register(cors, { origin: config.webOrigin, methods: ['GET'] });

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof RiotError) return reply.status(err.status).send({ error: err.message });
    reply.send(err);
  });

  app.get('/health', async () => ({
    ok: true,
    redis: redis.status,
    riotKeyConfigured: Boolean(config.riotApiKey),
    queued: limiter.pending,
  }));

  const riotIdParams = {
    gameName: { type: 'string', minLength: 3, maxLength: 16 },
    tagLine: { type: 'string', minLength: 3, maxLength: 5 },
  };

  app.get<{ Params: RiotId }>(
    '/account/:gameName/:tagLine',
    {
      schema: {
        params: { type: 'object', required: ['gameName', 'tagLine'], properties: riotIdParams },
      },
    },
    (req) => getAccountByRiotId(req.params.gameName, req.params.tagLine),
  );

  app.get<{ Params: RiotId & { platform: Platform } }>(
    '/profile/:platform/:gameName/:tagLine',
    {
      schema: {
        params: {
          type: 'object',
          required: ['platform', 'gameName', 'tagLine'],
          properties: {
            platform: { type: 'string', enum: Object.keys(PLATFORM_REGIONS) },
            ...riotIdParams,
          },
        },
      },
    },
    (req) => getProfile(req.params.platform, req.params.gameName, req.params.tagLine),
  );

  return app;
}

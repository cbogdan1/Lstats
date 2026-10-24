import Fastify from 'fastify';
import { redis } from './cache.js';
import { config } from './config.js';
import { getAccountByRiotId, limiter, RiotError } from './riot.js';

const app = Fastify({ logger: true });

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

app.get<{ Params: { gameName: string; tagLine: string } }>(
  '/account/:gameName/:tagLine',
  {
    schema: {
      params: {
        type: 'object',
        required: ['gameName', 'tagLine'],
        properties: {
          gameName: { type: 'string', minLength: 3, maxLength: 16 },
          tagLine: { type: 'string', minLength: 3, maxLength: 5 },
        },
      },
    },
  },
  (req) => getAccountByRiotId(req.params.gameName, req.params.tagLine),
);

// Local only for now; bind 0.0.0.0 (behind auth/TLS) when the proxy is hosted.
await app.listen({ port: config.port, host: '127.0.0.1' });
if (!config.riotApiKey) app.log.warn('RIOT_API_KEY is empty: Riot routes will return 503');

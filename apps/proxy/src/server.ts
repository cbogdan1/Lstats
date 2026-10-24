import { buildApp } from './app.js';
import { config } from './config.js';

const app = await buildApp();
// Local only for now; bind 0.0.0.0 (behind auth/TLS) when the proxy is hosted.
await app.listen({ port: config.port, host: '127.0.0.1' });
if (!config.riotApiKey) app.log.warn('RIOT_API_KEY is empty: Riot routes will return 503');

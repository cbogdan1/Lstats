# LoL Companion

Desktop companion app for League of Legends: detects game state locally and scouts the 10 players
from the loading screen onward. See `context.txt` for the full spec and the Riot compliance rules.

## Prerequisites

- Windows, Node.js 20+ (LTS), Git
- Docker inside WSL2 (for Redis). One-time container setup:

  ```sh
  wsl -e docker run -d --name lol-redis --restart unless-stopped -p 6379:6379 redis:7-alpine
  ```

  WSL shuts down when idle, so `npm run dev` attaches to the container (`npm run redis`) to keep it up.

## Riot API key

1. Get a development key at <https://developer.riotgames.com> (it expires every 24 h).
2. Paste it into `apps/proxy/.env` as `RIOT_API_KEY=...` (copy `.env.example` if `.env` is missing).
3. Set `RIOT_PLATFORM` (e.g. `eun1`, `euw1`) and `RIOT_REGION` (e.g. `europe`) for your server.

The key lives **only** in the proxy. The desktop app never sees it and talks only to the proxy.

## Run

```sh
npm install
npm run dev        # Redis + proxy (http://127.0.0.1:3001) + Electron app
```

Other scripts: `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run format`.

Quick checks: `curl localhost:3001/health`, `curl localhost:3001/account/<gameName>/<tagLine>`.

If League is installed elsewhere, set `LOL_LOCKFILE` to the full lockfile path before `npm run dev`.

## Structure

```
apps/
  desktop/          Electron + electron-vite + React + Tailwind
    src/main/       LCU connector (lockfile + WebSocket), Live Client poller
    src/preload/    window.api bridge (contextIsolation)
    src/renderer/   React UI
  proxy/            Fastify + ioredis: Riot API key, rate limiter (20/1s, 100/2min), cache
packages/
  shared/           Shared TypeScript types (Riot ID, PUUID, gameflow phases, player cards)
```

# Lstats

League of Legends companion:

- **Desktop app (Windows):** detects game state locally and scouts the 10 players from the loading
  screen onward.
- **Web app (desktop + mobile browsers):** look up players by Riot ID and download the desktop app.
  Browsers can't reach the local League client, so live-game features are desktop-only.

See `context.txt` for the full spec and the Riot compliance rules.

## Prerequisites

- Windows, Node.js 20+ (LTS), Git
- Docker inside WSL2 (for Redis). One-time container setup:

  ```sh
  wsl -e docker run -d --name lol-redis --restart unless-stopped -p 6379:6379 redis:7-alpine
  ```

  WSL shuts down when idle, so the dev scripts attach to the container (`npm run redis`) to keep it up.

## Riot API key

1. Get a development key at <https://developer.riotgames.com> (it expires every 24 h).
2. Paste it into `apps/proxy/.env` as `RIOT_API_KEY=...` (copy `.env.example` if `.env` is missing).
3. Set `RIOT_PLATFORM` (e.g. `eun1`, `euw1`) and `RIOT_REGION` (e.g. `europe`) for your server.

The key lives **only** in the proxy. The desktop and web apps never see it and talk only to the proxy.
A public deployment needs a Personal or Production key from Riot, not the dev key.

## Run

```sh
npm install
npm run dev        # Redis + proxy (http://127.0.0.1:3001) + Electron app
npm run dev:web    # Redis + proxy + web app (http://localhost:5173)
```

Other scripts: `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run format`.

Quick checks: `curl localhost:3001/health`, `curl localhost:3001/account/<gameName>/<tagLine>`.

If League is installed elsewhere, set `LOL_LOCKFILE` to the full lockfile path before `npm run dev`.

## Desktop installer

- Local build: `npm run dist:desktop` writes `apps/desktop/release/Lstats-Setup.exe`.
- Release: bump `version` in `apps/desktop/package.json`, commit, then push a matching tag
  (`git tag v0.1.0 && git push origin v0.1.0`). GitHub Actions builds the installer and attaches it to
  a GitHub Release. The web app's download button always points at the latest release.
- The installer is unsigned, so Windows SmartScreen shows a warning until code signing is added.

## Web deployment

`npm run build -w @lol/web` outputs static files in `apps/web/dist` (any static host works).

- Build with `VITE_API_URL=https://<your-proxy-host>` so the site calls the hosted proxy.
- Set `WEB_ORIGIN=https://<your-web-host>` in the proxy's environment. CORS only allows that origin.

## Structure

```
apps/
  desktop/          Electron + electron-vite + React + Tailwind, packaged with electron-builder
    src/main/       LCU connector (lockfile + WebSocket), Live Client poller
    src/preload/    window.api bridge (contextIsolation)
    src/renderer/   React UI
  web/              Vite + React + Tailwind responsive site (player lookup, download page)
  proxy/            Fastify + ioredis: Riot API key, rate limiter (20/1s, 100/2min), cache, CORS
packages/
  shared/           Shared TypeScript types (Riot ID, PUUID, gameflow phases, player cards)
.github/workflows/  release.yml: builds and publishes the Windows installer on version tags
```

import { EventEmitter } from 'node:events';
import { readFile } from 'node:fs/promises';
import WebSocket from 'ws';
import type { GameflowPhase } from '@lol/shared';
import { localAgent, localGetJson } from './local';

export const DEFAULT_LOCKFILE = 'C:\\Riot Games\\League of Legends\\lockfile';
const PHASE_EVENT = 'OnJsonApiEvent_lol-gameflow_v1_gameflow-phase';
const RETRY_MS = 5000;

// WAMP opcodes used by the LCU socket.
const SUBSCRIBE = 5;
const EVENT = 8;

/** Lockfile format: `name:pid:port:password:protocol`. */
export function parseLockfile(text: string): { port: number; password: string } {
  const [, , port, password] = text.trim().split(':');
  if (!port || !password) throw new Error('Malformed lockfile');
  return { port: Number(port), password };
}

/**
 * Watches the League client's gameflow phase over the LCU WebSocket.
 * Deliberately does NOT subscribe to champ-select sessions to scout other players: identities
 * there are hidden by Riot and must stay hidden (context.txt §3).
 */
export class LcuConnector extends EventEmitter<{ phase: [GameflowPhase] }> {
  phase: GameflowPhase = 'None';
  private ws?: WebSocket;
  private retry?: NodeJS.Timeout;
  private stopped = true;

  constructor(
    private readonly lockfilePath = DEFAULT_LOCKFILE,
    private readonly retryMs = RETRY_MS,
  ) {
    super();
  }

  start(): void {
    this.stopped = false;
    void this.connect();
  }

  stop(): void {
    this.stopped = true;
    clearTimeout(this.retry);
    this.ws?.close();
  }

  private async connect(): Promise<void> {
    let creds;
    try {
      creds = parseLockfile(await readFile(this.lockfilePath, 'utf8'));
    } catch {
      return this.scheduleRetry(); // client not running yet
    }
    if (this.stopped) return; // stop() ran while the lockfile was being read
    const auth = `Basic ${Buffer.from(`riot:${creds.password}`).toString('base64')}`;
    const ws = new WebSocket(`wss://127.0.0.1:${creds.port}`, 'wamp', {
      headers: { Authorization: auth },
      agent: localAgent,
    });
    this.ws = ws;
    let sawEvent = false;

    ws.on('open', async () => {
      ws.send(JSON.stringify([SUBSCRIBE, PHASE_EVENT]));
      try {
        const initial = await localGetJson<GameflowPhase>(
          `https://127.0.0.1:${creds.port}/lol-gameflow/v1/gameflow-phase`,
          auth,
        );
        // A pushed event or a disconnect is newer than this snapshot; don't overwrite it.
        if (!sawEvent && ws.readyState === WebSocket.OPEN) this.setPhase(initial);
      } catch {
        // Not ready yet; the subscription will deliver the next change.
      }
    });
    ws.on('message', (raw) => {
      let msg: unknown;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return; // LCU sends empty frames
      }
      if (Array.isArray(msg) && msg[0] === EVENT && msg[1] === PHASE_EVENT) {
        sawEvent = true;
        this.setPhase(msg[2].data);
      }
    });
    ws.on('error', () => {}); // 'close' always follows and handles reconnect
    ws.on('close', () => {
      this.setPhase('None');
      this.scheduleRetry();
    });
  }

  private scheduleRetry(): void {
    if (!this.stopped) this.retry = setTimeout(() => void this.connect(), this.retryMs);
  }

  private setPhase(phase: GameflowPhase): void {
    if (phase === this.phase) return;
    this.phase = phase;
    this.emit('phase', phase);
  }
}

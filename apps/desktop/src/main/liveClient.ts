import { EventEmitter } from 'node:events';
import type { LiveGameData } from '@lol/shared';
import { localGetJson } from './local';

const URL = 'https://127.0.0.1:2999/liveclientdata/allgamedata';
const POLL_MS = 5000;

/**
 * Polls Riot's official Live Client Data API while a game is running.
 * Use it only for player identities and champions (scouting). Never build cooldown, timer or
 * real-time alert features on top of it (context.txt §3).
 */
export class LiveClientPoller extends EventEmitter<{ data: [LiveGameData] }> {
  private timer?: NodeJS.Timeout;

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.poll(), POLL_MS);
    void this.poll();
  }

  stop(): void {
    clearInterval(this.timer);
    this.timer = undefined;
  }

  private async poll(): Promise<void> {
    try {
      const data = await localGetJson<LiveGameData>(URL);
      if (this.timer) this.emit('data', data);
    } catch {
      // Game still loading: the endpoint is not up yet.
    }
  }
}

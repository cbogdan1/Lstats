export interface Limit {
  count: number;
  windowMs: number;
}

export type Priority = 'normal' | 'low';

/**
 * FIFO queue that never lets more than `count` calls start within any `windowMs`, for every limit.
 * Low-priority calls (background crawls) only start when no normal call is waiting, and may only
 * use `lowShare` of each window, so the rest of the budget stays free for interactive lookups.
 */
export class RateLimiter {
  private stamps: number[] = [];
  private queue: (() => void)[] = [];
  private lowQueue: (() => void)[] = [];
  private timer?: NodeJS.Timeout;
  private blockedUntil = 0;

  constructor(
    private readonly limits: Limit[],
    private readonly lowShare = 1,
  ) {}

  schedule<T>(fn: () => Promise<T>, priority: Priority = 'normal'): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      (priority === 'low' ? this.lowQueue : this.queue).push(() => fn().then(resolve, reject));
      this.drain();
    });
  }

  /** Stop starting calls for `ms` (e.g. after a 429 with Retry-After). */
  pause(ms: number): void {
    this.blockedUntil = Math.max(this.blockedUntil, Date.now() + ms);
  }

  get pending(): number {
    return this.queue.length + this.lowQueue.length;
  }

  private drain(): void {
    // Re-plan on every call: a normal call arriving while we wait on a low one may start sooner.
    clearTimeout(this.timer);
    this.timer = undefined;
    while (this.queue.length || this.lowQueue.length) {
      const priority: Priority = this.queue.length ? 'normal' : 'low';
      const wait = this.waitMs(priority);
      if (wait > 0) {
        this.timer = setTimeout(() => this.drain(), wait);
        return;
      }
      this.stamps.push(Date.now());
      (priority === 'normal' ? this.queue : this.lowQueue).shift()!();
    }
  }

  private waitMs(priority: Priority): number {
    const now = Date.now();
    const longest = Math.max(...this.limits.map((l) => l.windowMs));
    this.stamps = this.stamps.filter((s) => now - s < longest);
    let wait = this.blockedUntil - now;
    for (const limit of this.limits) {
      const count =
        priority === 'low' ? Math.max(1, Math.floor(limit.count * this.lowShare)) : limit.count;
      const inWindow = this.stamps.filter((s) => now - s < limit.windowMs);
      // The call `count` slots back must leave the window before another may start.
      if (inWindow.length >= count)
        wait = Math.max(wait, inWindow[inWindow.length - count]! + limit.windowMs - now);
    }
    return wait;
  }
}

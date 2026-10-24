export interface Limit {
  count: number;
  windowMs: number;
}

/** FIFO queue that never lets more than `count` calls start within any `windowMs`, for every limit. */
export class RateLimiter {
  private stamps: number[] = [];
  private queue: (() => void)[] = [];
  private timer?: NodeJS.Timeout;
  private blockedUntil = 0;

  constructor(private readonly limits: Limit[]) {}

  schedule<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(() => fn().then(resolve, reject));
      this.drain();
    });
  }

  /** Stop starting calls for `ms` (e.g. after a 429 with Retry-After). */
  pause(ms: number): void {
    this.blockedUntil = Math.max(this.blockedUntil, Date.now() + ms);
  }

  get pending(): number {
    return this.queue.length;
  }

  private drain(): void {
    if (this.timer) return;
    while (this.queue.length) {
      const wait = this.waitMs();
      if (wait > 0) {
        this.timer = setTimeout(() => {
          this.timer = undefined;
          this.drain();
        }, wait);
        return;
      }
      this.stamps.push(Date.now());
      this.queue.shift()!();
    }
  }

  private waitMs(): number {
    const now = Date.now();
    const longest = Math.max(...this.limits.map((l) => l.windowMs));
    this.stamps = this.stamps.filter((s) => now - s < longest);
    let wait = this.blockedUntil - now;
    for (const { count, windowMs } of this.limits) {
      const inWindow = this.stamps.filter((s) => now - s < windowMs);
      // The call `count` slots back must leave the window before another may start.
      if (inWindow.length >= count)
        wait = Math.max(wait, inWindow[inWindow.length - count]! + windowMs - now);
    }
    return wait;
  }
}

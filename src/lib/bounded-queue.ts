export class QueueFullError extends Error {}

/** Slots transfer directly to waiters; aborted waiters never acquire a slot. */
export class BoundedQueue {
  private active = 0;
  private waiting: Array<{ resolve: (release: () => void) => void; reject: (error: unknown) => void; signal: AbortSignal; abort: () => void }> = [];
  constructor(private readonly concurrency: number, private readonly maxWaiting: number) {}
  async acquire(signal: AbortSignal): Promise<() => void> {
    signal.throwIfAborted();
    if (this.active < this.concurrency) { this.active++; return this.release(); }
    if (this.waiting.length >= this.maxWaiting) throw new QueueFullError("解析服务繁忙，请稍后重试");
    return new Promise((resolve, reject) => {
      const entry = { resolve, reject, signal, abort: () => {
        this.waiting = this.waiting.filter(item => item !== entry);
        reject(signal.reason);
      } };
      this.waiting.push(entry);
      signal.addEventListener("abort", entry.abort, { once: true });
    });
  }
  private release(): () => void {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const next = this.waiting.shift();
      if (next) {
        next.signal.removeEventListener("abort", next.abort);
        next.resolve(this.release());
      } else this.active--;
    };
  }
}

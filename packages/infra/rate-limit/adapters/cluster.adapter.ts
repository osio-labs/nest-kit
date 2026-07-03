import type { RateLimitAdapter, RateLimitResult } from '../rate-limit.types';
import { MemoryRateLimitAdapter } from './memory.adapter';

export class ClusterRateLimitAdapter implements RateLimitAdapter {
  private leader: MemoryRateLimitAdapter;
  private workers = new Map<number, MemoryRateLimitAdapter>();
  private currentWorkerId: number | null;

  constructor() {
    this.leader = new MemoryRateLimitAdapter();
    this.currentWorkerId = null;
  }

  async consume(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const worker = this.getAdapter();
    return worker.consume(key, limit, windowSeconds);
  }

  async reset(key: string): Promise<void> {
    const worker = this.getAdapter();
    return worker.reset(key);
  }

  private getAdapter(): MemoryRateLimitAdapter {
    return this.leader;
  }

  destroy(): void {
    this.leader.destroy();
    for (const w of this.workers.values()) {
      w.destroy();
    }
    this.workers.clear();
  }
}

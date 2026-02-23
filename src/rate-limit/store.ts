import type { CacheAdapter } from "../cache/adapter.js";

export interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<RateLimitRecord>;
  reset(key: string): Promise<void>;
}

export class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, RateLimitRecord>();

  async increment(key: string, windowMs: number): Promise<RateLimitRecord> {
    const now = Date.now();
    const existing = this.store.get(key);

    if (!existing || now >= existing.resetAt) {
      const record: RateLimitRecord = { count: 1, resetAt: now + windowMs };
      this.store.set(key, record);
      return record;
    }

    existing.count++;
    return existing;
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }
}

export class CacheRateLimitStore implements RateLimitStore {
  private cache: CacheAdapter;

  constructor(cache: CacheAdapter) {
    this.cache = cache;
  }

  async increment(key: string, windowMs: number): Promise<RateLimitRecord> {
    const now = Date.now();
    const existing = await this.cache.get<RateLimitRecord>(key);

    if (!existing || now >= existing.resetAt) {
      const record: RateLimitRecord = { count: 1, resetAt: now + windowMs };
      await this.cache.set(key, record, windowMs);
      return record;
    }

    existing.count++;
    const remainingMs = existing.resetAt - now;
    await this.cache.set(key, existing, remainingMs);
    return existing;
  }

  async reset(key: string): Promise<void> {
    await this.cache.del(key);
  }
}

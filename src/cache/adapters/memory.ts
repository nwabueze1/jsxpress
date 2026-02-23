import type { CacheAdapter } from "../adapter.js";

interface CacheEntry {
  value: unknown;
  expiresAt: number | null;
}

export class MemoryAdapter implements CacheAdapter {
  private store = new Map<string, CacheEntry>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  async get<T = unknown>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set(key: string, value: unknown, ttlMs?: number): Promise<void> {
    const oldTimer = this.timers.get(key);
    if (oldTimer !== undefined) {
      clearTimeout(oldTimer);
      this.timers.delete(key);
    }

    const expiresAt = ttlMs != null ? Date.now() + ttlMs : null;
    this.store.set(key, { value, expiresAt });

    if (ttlMs != null) {
      const timer = setTimeout(() => {
        this.store.delete(key);
        this.timers.delete(key);
      }, ttlMs);
      this.timers.set(key, timer);
    }
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
    const timer = this.timers.get(key);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  async has(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (entry.expiresAt !== null && Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  async close(): Promise<void> {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.store.clear();
  }
}

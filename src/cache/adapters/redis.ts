import type { CacheAdapter } from "../adapter.js";

export interface RedisAdapterConfig {
  url: string;
}

export class RedisAdapter implements CacheAdapter {
  private client: any = null;
  private config: RedisAdapterConfig;

  constructor(config: RedisAdapterConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    const { default: Redis } = await import(/* @vite-ignore */ "ioredis");
    this.client = new Redis(this.config.url);
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  }

  async set(key: string, value: unknown, ttlMs?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlMs != null) {
      const ttlSeconds = Math.ceil(ttlMs / 1000);
      await this.client.setex(key, ttlSeconds, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async has(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }
}

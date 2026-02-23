import type { CacheAdapter, CacheDriver } from "./adapter.js";
import { MemoryAdapter } from "./adapters/memory.js";
import type { RedisAdapterConfig } from "./adapters/redis.js";
import { RedisAdapter } from "./adapters/redis.js";

export function createCacheAdapter(
  driver: CacheDriver,
  config?: RedisAdapterConfig,
): CacheAdapter {
  switch (driver) {
    case "memory":
      return new MemoryAdapter();
    case "redis":
      return new RedisAdapter(config as RedisAdapterConfig);
    default:
      throw new Error(`Unsupported cache driver: ${driver}`);
  }
}

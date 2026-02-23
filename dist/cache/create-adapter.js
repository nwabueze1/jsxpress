import { MemoryAdapter } from "./adapters/memory.js";
import { RedisAdapter } from "./adapters/redis.js";
export function createCacheAdapter(driver, config) {
    switch (driver) {
        case "memory":
            return new MemoryAdapter();
        case "redis":
            return new RedisAdapter(config);
        default:
            throw new Error(`Unsupported cache driver: ${driver}`);
    }
}
//# sourceMappingURL=create-adapter.js.map
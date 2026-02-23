export class MemoryRateLimitStore {
    store = new Map();
    async increment(key, windowMs) {
        const now = Date.now();
        const existing = this.store.get(key);
        if (!existing || now >= existing.resetAt) {
            const record = { count: 1, resetAt: now + windowMs };
            this.store.set(key, record);
            return record;
        }
        existing.count++;
        return existing;
    }
    async reset(key) {
        this.store.delete(key);
    }
}
export class CacheRateLimitStore {
    cache;
    constructor(cache) {
        this.cache = cache;
    }
    async increment(key, windowMs) {
        const now = Date.now();
        const existing = await this.cache.get(key);
        if (!existing || now >= existing.resetAt) {
            const record = { count: 1, resetAt: now + windowMs };
            await this.cache.set(key, record, windowMs);
            return record;
        }
        existing.count++;
        const remainingMs = existing.resetAt - now;
        await this.cache.set(key, existing, remainingMs);
        return existing;
    }
    async reset(key) {
        await this.cache.del(key);
    }
}
//# sourceMappingURL=store.js.map
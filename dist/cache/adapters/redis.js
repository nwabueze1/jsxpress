export class RedisAdapter {
    client = null;
    config;
    constructor(config) {
        this.config = config;
    }
    async initialize() {
        const { default: Redis } = await import(/* @vite-ignore */ "ioredis");
        this.client = new Redis(this.config.url);
    }
    async get(key) {
        const raw = await this.client.get(key);
        if (raw === null)
            return null;
        return JSON.parse(raw);
    }
    async set(key, value, ttlMs) {
        const serialized = JSON.stringify(value);
        if (ttlMs != null) {
            const ttlSeconds = Math.ceil(ttlMs / 1000);
            await this.client.setex(key, ttlSeconds, serialized);
        }
        else {
            await this.client.set(key, serialized);
        }
    }
    async del(key) {
        await this.client.del(key);
    }
    async has(key) {
        const result = await this.client.exists(key);
        return result === 1;
    }
    async close() {
        if (this.client) {
            await this.client.quit();
            this.client = null;
        }
    }
}
//# sourceMappingURL=redis.js.map
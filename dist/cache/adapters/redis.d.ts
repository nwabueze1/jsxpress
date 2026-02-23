import type { CacheAdapter } from "../adapter.js";
export interface RedisAdapterConfig {
    url: string;
}
export declare class RedisAdapter implements CacheAdapter {
    private client;
    private config;
    constructor(config: RedisAdapterConfig);
    initialize(): Promise<void>;
    get<T = unknown>(key: string): Promise<T | null>;
    set(key: string, value: unknown, ttlMs?: number): Promise<void>;
    del(key: string): Promise<void>;
    has(key: string): Promise<boolean>;
    close(): Promise<void>;
}
//# sourceMappingURL=redis.d.ts.map
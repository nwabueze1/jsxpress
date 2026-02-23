import type { CacheAdapter } from "../cache/adapter.js";
export interface RateLimitRecord {
    count: number;
    resetAt: number;
}
export interface RateLimitStore {
    increment(key: string, windowMs: number): Promise<RateLimitRecord>;
    reset(key: string): Promise<void>;
}
export declare class MemoryRateLimitStore implements RateLimitStore {
    private store;
    increment(key: string, windowMs: number): Promise<RateLimitRecord>;
    reset(key: string): Promise<void>;
}
export declare class CacheRateLimitStore implements RateLimitStore {
    private cache;
    constructor(cache: CacheAdapter);
    increment(key: string, windowMs: number): Promise<RateLimitRecord>;
    reset(key: string): Promise<void>;
}
//# sourceMappingURL=store.d.ts.map
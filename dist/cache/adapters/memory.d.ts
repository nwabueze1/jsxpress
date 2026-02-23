import type { CacheAdapter } from "../adapter.js";
export declare class MemoryAdapter implements CacheAdapter {
    private store;
    private timers;
    get<T = unknown>(key: string): Promise<T | null>;
    set(key: string, value: unknown, ttlMs?: number): Promise<void>;
    del(key: string): Promise<void>;
    has(key: string): Promise<boolean>;
    close(): Promise<void>;
}
//# sourceMappingURL=memory.d.ts.map
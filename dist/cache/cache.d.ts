import { Provider } from "../components/Provider.js";
import type { CacheAdapter, CacheDriver } from "./adapter.js";
export declare const CACHE_KEY: unique symbol;
export interface CacheProps {
    driver: CacheDriver;
    redisUrl?: string;
    children?: unknown;
}
export declare class Cache extends Provider {
    contextKey: symbol;
    private adapter;
    constructor(props: CacheProps);
    getContextValue(): CacheAdapter;
    startup(): Promise<void>;
    shutdown(): Promise<void>;
}
//# sourceMappingURL=cache.d.ts.map
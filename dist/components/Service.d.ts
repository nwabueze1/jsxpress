import type { Repository } from "../db/repository.js";
import type { DatabaseAdapter } from "../db/adapter.js";
import type { StorageAdapter } from "../storage/adapter.js";
import type { CacheAdapter } from "../cache/adapter.js";
export declare abstract class Service {
    /** @internal — populated by Controller when instantiated via this.service() */
    __context: Map<symbol, unknown>;
    private __repos;
    protected context<T>(key: symbol): T;
    protected config<T = Record<string, unknown>>(): T;
    protected storage(): StorageAdapter;
    protected cache(): CacheAdapter;
    protected repo<T extends Repository>(RepoClass: new (db: DatabaseAdapter) => T): T;
}
//# sourceMappingURL=Service.d.ts.map
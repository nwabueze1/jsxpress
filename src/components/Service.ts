import type { Repository } from "../db/repository.js";
import type { DatabaseAdapter } from "../db/adapter.js";
import { DATABASE_KEY } from "../db/database.js";
import type { StorageAdapter } from "../storage/adapter.js";
import { STORAGE_KEY } from "../storage/storage.js";
import type { CacheAdapter } from "../cache/adapter.js";
import { CACHE_KEY } from "../cache/cache.js";

const CONFIG_KEY = Symbol.for("jsxpress.config");

export abstract class Service {
  /** @internal — populated by Controller when instantiated via this.service() */
  __context: Map<symbol, unknown> = new Map();

  private __repos = new Map<Function, Repository>();

  protected context<T>(key: symbol): T {
    if (!this.__context.has(key)) {
      throw new Error(`Context not found for key: ${key.toString()}`);
    }
    return this.__context.get(key) as T;
  }

  protected config<T = Record<string, unknown>>(): T {
    return this.context<T>(CONFIG_KEY);
  }

  protected storage(): StorageAdapter {
    return this.context<StorageAdapter>(STORAGE_KEY);
  }

  protected cache(): CacheAdapter {
    return this.context<CacheAdapter>(CACHE_KEY);
  }

  protected repo<T extends Repository>(RepoClass: new (db: DatabaseAdapter) => T): T {
    if (!this.__repos.has(RepoClass)) {
      const db = this.context<DatabaseAdapter>(DATABASE_KEY);
      this.__repos.set(RepoClass, new RepoClass(db));
    }
    return this.__repos.get(RepoClass) as T;
  }
}

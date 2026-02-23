import { DATABASE_KEY } from "../db/database.js";
import { STORAGE_KEY } from "../storage/storage.js";
import { CACHE_KEY } from "../cache/cache.js";
const CONFIG_KEY = Symbol.for("jsxpress.config");
export class Service {
    /** @internal — populated by Controller when instantiated via this.service() */
    __context = new Map();
    __repos = new Map();
    context(key) {
        if (!this.__context.has(key)) {
            throw new Error(`Context not found for key: ${key.toString()}`);
        }
        return this.__context.get(key);
    }
    config() {
        return this.context(CONFIG_KEY);
    }
    storage() {
        return this.context(STORAGE_KEY);
    }
    cache() {
        return this.context(CACHE_KEY);
    }
    repo(RepoClass) {
        if (!this.__repos.has(RepoClass)) {
            const db = this.context(DATABASE_KEY);
            this.__repos.set(RepoClass, new RepoClass(db));
        }
        return this.__repos.get(RepoClass);
    }
}
//# sourceMappingURL=Service.js.map
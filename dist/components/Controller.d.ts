import type { JsxpressRequest } from "../types.js";
import type { ControllerSchema } from "../validation.js";
import type { Repository } from "../db/repository.js";
import type { DatabaseAdapter } from "../db/adapter.js";
import type { StorageAdapter } from "../storage/adapter.js";
import type { CacheAdapter } from "../cache/adapter.js";
import { Service } from "./Service.js";
export declare abstract class Controller {
    abstract name: string;
    schema?: ControllerSchema;
    /** @internal — populated by tree compiler from Provider context */
    __context: Map<symbol, unknown>;
    private __repos;
    private __services;
    protected context<T>(key: symbol): T;
    protected config<T = Record<string, unknown>>(): T;
    protected storage(): StorageAdapter;
    protected cache(): CacheAdapter;
    protected repo<T extends Repository>(RepoClass: new (db: DatabaseAdapter) => T): T;
    protected service<T extends Service>(ServiceClass: new () => T): T;
    get?(req: JsxpressRequest): unknown | Promise<unknown>;
    post?(req: JsxpressRequest): unknown | Promise<unknown>;
    put?(req: JsxpressRequest): unknown | Promise<unknown>;
    patch?(req: JsxpressRequest): unknown | Promise<unknown>;
    delete?(req: JsxpressRequest): unknown | Promise<unknown>;
    head?(req: JsxpressRequest): unknown | Promise<unknown>;
    options?(req: JsxpressRequest): unknown | Promise<unknown>;
}
//# sourceMappingURL=Controller.d.ts.map
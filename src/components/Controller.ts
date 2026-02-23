import type { JsxpressRequest } from "../types.js";
import type { ControllerSchema } from "../validation.js";
import type { Repository } from "../db/repository.js";
import type { DatabaseAdapter } from "../db/adapter.js";
import { DATABASE_KEY } from "../db/database.js";

const CONFIG_KEY = Symbol.for("jsxpress.config");

export abstract class Controller {
  abstract name: string;
  schema?: ControllerSchema;

  /** @internal — populated by tree compiler from Provider context */
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

  protected repo<T extends Repository>(RepoClass: new (db: DatabaseAdapter) => T): T {
    if (!this.__repos.has(RepoClass)) {
      const db = this.context<DatabaseAdapter>(DATABASE_KEY);
      this.__repos.set(RepoClass, new RepoClass(db));
    }
    return this.__repos.get(RepoClass) as T;
  }

  get?(req: JsxpressRequest): unknown | Promise<unknown>;
  post?(req: JsxpressRequest): unknown | Promise<unknown>;
  put?(req: JsxpressRequest): unknown | Promise<unknown>;
  patch?(req: JsxpressRequest): unknown | Promise<unknown>;
  delete?(req: JsxpressRequest): unknown | Promise<unknown>;
  head?(req: JsxpressRequest): unknown | Promise<unknown>;
  options?(req: JsxpressRequest): unknown | Promise<unknown>;
}

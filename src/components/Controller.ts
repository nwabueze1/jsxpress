import type { JsxpressRequest } from "../types.js";
import type { ControllerSchema } from "../validation.js";

export abstract class Controller {
  abstract name: string;
  schema?: ControllerSchema;

  /** @internal — populated by tree compiler from Provider context */
  __context: Map<symbol, unknown> = new Map();

  protected context<T>(key: symbol): T {
    if (!this.__context.has(key)) {
      throw new Error(`Context not found for key: ${key.toString()}`);
    }
    return this.__context.get(key) as T;
  }

  get?(req: JsxpressRequest): unknown | Promise<unknown>;
  post?(req: JsxpressRequest): unknown | Promise<unknown>;
  put?(req: JsxpressRequest): unknown | Promise<unknown>;
  patch?(req: JsxpressRequest): unknown | Promise<unknown>;
  delete?(req: JsxpressRequest): unknown | Promise<unknown>;
  head?(req: JsxpressRequest): unknown | Promise<unknown>;
  options?(req: JsxpressRequest): unknown | Promise<unknown>;
}

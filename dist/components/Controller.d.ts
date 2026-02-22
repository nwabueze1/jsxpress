import type { JsxpressRequest } from "../types.js";
import type { ControllerSchema } from "../validation.js";
export declare abstract class Controller {
    abstract name: string;
    schema?: ControllerSchema;
    /** @internal — populated by tree compiler from Provider context */
    __context: Map<symbol, unknown>;
    protected context<T>(key: symbol): T;
    protected config<T = Record<string, unknown>>(): T;
    get?(req: JsxpressRequest): unknown | Promise<unknown>;
    post?(req: JsxpressRequest): unknown | Promise<unknown>;
    put?(req: JsxpressRequest): unknown | Promise<unknown>;
    patch?(req: JsxpressRequest): unknown | Promise<unknown>;
    delete?(req: JsxpressRequest): unknown | Promise<unknown>;
    head?(req: JsxpressRequest): unknown | Promise<unknown>;
    options?(req: JsxpressRequest): unknown | Promise<unknown>;
}
//# sourceMappingURL=Controller.d.ts.map
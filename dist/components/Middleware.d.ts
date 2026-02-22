import type { JsxpressRequest, NextFunction } from "../types.js";
export declare abstract class Middleware {
    abstract handle(req: JsxpressRequest, next: NextFunction): Response | Promise<Response>;
}
//# sourceMappingURL=Middleware.d.ts.map
import type { JsxpressRequest, NextFunction } from "../types.js";

export abstract class Middleware {
  abstract handle(req: JsxpressRequest, next: NextFunction): Response | Promise<Response>;
}

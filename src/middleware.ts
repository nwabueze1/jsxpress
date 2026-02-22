import type { JsxpressRequest, MiddlewareHandler, RouteHandler } from "./types.js";
import { toResponse } from "./response.js";

export async function executeChain(
  middlewares: MiddlewareHandler[],
  handler: RouteHandler,
  req: JsxpressRequest
): Promise<Response> {
  let index = 0;

  async function next(): Promise<Response> {
    if (index < middlewares.length) {
      const mw = middlewares[index++];
      return await mw(req, next);
    }
    const result = await handler(req);
    return toResponse(result);
  }

  return next();
}

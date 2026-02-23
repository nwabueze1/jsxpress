import type { JsxpressRequest, MiddlewareHandler, RouteHandler } from "./types.js";
import { toResponse } from "./response.js";
import { HttpError } from "./errors.js";

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

  try {
    return await next();
  } catch (error) {
    if (error instanceof HttpError) {
      const body: Record<string, unknown> = { error: error.message };
      if (error.details) body.details = error.details;
      return Response.json(body, { status: error.status });
    }

    console.error("[jsxpress]", error);
    return Response.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

import { toResponse } from "./response.js";
import { HttpError } from "./errors.js";
export async function executeChain(middlewares, handler, req) {
    let index = 0;
    async function next() {
        if (index < middlewares.length) {
            const mw = middlewares[index++];
            return await mw(req, next);
        }
        const result = await handler(req);
        return toResponse(result);
    }
    try {
        return await next();
    }
    catch (error) {
        if (error instanceof HttpError) {
            const body = { error: error.message };
            if (error.details)
                body.details = error.details;
            return Response.json(body, { status: error.status });
        }
        console.error("[jsxpress]", error);
        return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
//# sourceMappingURL=middleware.js.map
import { toResponse } from "./response.js";
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
    return next();
}
//# sourceMappingURL=middleware.js.map
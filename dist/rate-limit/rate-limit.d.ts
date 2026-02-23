import { Middleware } from "../components/Middleware.js";
import type { JsxpressRequest, NextFunction } from "../types.js";
import type { RateLimitStore } from "./store.js";
export interface RateLimitProps {
    windowMs: number;
    max: number;
    message?: string;
    keyFn?: (req: JsxpressRequest) => string;
    store?: RateLimitStore;
    children?: unknown;
}
export declare class RateLimit extends Middleware {
    private windowMs;
    private max;
    private message;
    private keyFn;
    private store;
    constructor(props: RateLimitProps);
    handle(req: JsxpressRequest, next: NextFunction): Promise<Response>;
}
//# sourceMappingURL=rate-limit.d.ts.map
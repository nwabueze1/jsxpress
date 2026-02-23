import { Middleware } from "../components/Middleware.js";
import { MemoryRateLimitStore } from "./store.js";
function defaultKeyFn(req) {
    return (req.headers.get("x-forwarded-for") ??
        req.headers.get("cf-connecting-ip") ??
        "unknown");
}
export class RateLimit extends Middleware {
    windowMs;
    max;
    message;
    keyFn;
    store;
    constructor(props) {
        super();
        this.windowMs = props.windowMs;
        this.max = props.max;
        this.message = props.message ?? "Too Many Requests";
        this.keyFn = props.keyFn ?? defaultKeyFn;
        this.store = props.store ?? new MemoryRateLimitStore();
    }
    async handle(req, next) {
        const key = this.keyFn(req);
        const record = await this.store.increment(key, this.windowMs);
        const remaining = Math.max(0, this.max - record.count);
        const resetSeconds = Math.ceil(record.resetAt / 1000);
        if (record.count > this.max) {
            return new Response(JSON.stringify({ error: this.message }), {
                status: 429,
                headers: {
                    "Content-Type": "application/json",
                    "X-RateLimit-Limit": String(this.max),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": String(resetSeconds),
                },
            });
        }
        const response = await next();
        const newHeaders = new Headers(response.headers);
        newHeaders.set("X-RateLimit-Limit", String(this.max));
        newHeaders.set("X-RateLimit-Remaining", String(remaining));
        newHeaders.set("X-RateLimit-Reset", String(resetSeconds));
        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
        });
    }
}
//# sourceMappingURL=rate-limit.js.map
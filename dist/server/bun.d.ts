import type { ServerAdapter, ServerHandle } from "./types.js";
export declare class BunAdapter implements ServerAdapter {
    listen(handler: (req: Request) => Promise<Response>, port: number, hostname: string): Promise<ServerHandle>;
}
//# sourceMappingURL=bun.d.ts.map
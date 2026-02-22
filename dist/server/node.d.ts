import type { ServerAdapter, ServerHandle } from "./types.js";
export declare class NodeAdapter implements ServerAdapter {
    listen(handler: (req: Request) => Promise<Response>, port: number, hostname: string): Promise<ServerHandle>;
}
//# sourceMappingURL=node.d.ts.map
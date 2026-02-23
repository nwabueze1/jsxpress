import type { ServerAdapter, ServerHandle } from "./types.js";

export class BunAdapter implements ServerAdapter {
  async listen(
    handler: (req: Request) => Promise<Response>,
    port: number,
    hostname: string
  ): Promise<ServerHandle> {
    const Bun = (globalThis as any).Bun;
    const server = Bun.serve({
      port,
      hostname,
      async fetch(req: Request) {
        try {
          return await handler(req);
        } catch (error) {
          console.error("[jsxpress]", error);
          return Response.json(
            { error: "Internal Server Error" },
            { status: 500 }
          );
        }
      },
    });

    return {
      port: server.port,
      hostname: server.hostname,
      close() {
        server.stop();
      },
    };
  }
}

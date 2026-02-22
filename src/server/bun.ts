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
      fetch: handler,
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

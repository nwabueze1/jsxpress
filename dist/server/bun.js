export class BunAdapter {
    async listen(handler, port, hostname) {
        const Bun = globalThis.Bun;
        const server = Bun.serve({
            port,
            hostname,
            async fetch(req) {
                try {
                    return await handler(req);
                }
                catch (error) {
                    console.error("[jsxpress]", error);
                    return Response.json({ error: "Internal Server Error" }, { status: 500 });
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
//# sourceMappingURL=bun.js.map
export class BunAdapter {
    async listen(handler, port, hostname) {
        const Bun = globalThis.Bun;
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
//# sourceMappingURL=bun.js.map
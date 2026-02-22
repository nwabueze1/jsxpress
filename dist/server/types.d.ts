export interface ServerHandle {
    port: number;
    hostname: string;
    close(): void | Promise<void>;
}
export interface ServerAdapter {
    listen(handler: (req: Request) => Promise<Response>, port: number, hostname: string): Promise<ServerHandle>;
}
//# sourceMappingURL=types.d.ts.map
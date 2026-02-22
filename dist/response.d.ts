export declare function toResponse(value: unknown): Response;
export declare const Res: {
    json(data: unknown, status?: number): Response;
    text(body: string, status?: number): Response;
    created(data?: unknown): Response;
    noContent(): Response;
    unauthorized(message?: string): Response;
    forbidden(message?: string): Response;
    notFound(message?: string): Response;
    error(message?: string, status?: number): Response;
    redirect(url: string, status?: 301 | 302 | 307 | 308): Response;
};
//# sourceMappingURL=response.d.ts.map
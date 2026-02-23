export declare class HttpError extends Error {
    status: number;
    details?: unknown;
    constructor(status: number, message: string, details?: unknown);
    static badRequest(message?: string, details?: unknown): HttpError;
    static unauthorized(message?: string): HttpError;
    static forbidden(message?: string): HttpError;
    static notFound(message?: string): HttpError;
    static conflict(message?: string): HttpError;
    static internal(message?: string): HttpError;
}
//# sourceMappingURL=errors.d.ts.map
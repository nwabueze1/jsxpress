export class HttpError extends Error {
    status;
    details;
    constructor(status, message, details) {
        super(message);
        this.name = "HttpError";
        this.status = status;
        this.details = details;
    }
    static badRequest(message = "Bad Request", details) {
        return new HttpError(400, message, details);
    }
    static unauthorized(message = "Unauthorized") {
        return new HttpError(401, message);
    }
    static forbidden(message = "Forbidden") {
        return new HttpError(403, message);
    }
    static notFound(message = "Not Found") {
        return new HttpError(404, message);
    }
    static conflict(message = "Conflict") {
        return new HttpError(409, message);
    }
    static internal(message = "Internal Server Error") {
        return new HttpError(500, message);
    }
}
//# sourceMappingURL=errors.js.map
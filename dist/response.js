export function toResponse(value) {
    if (value instanceof Response)
        return value;
    if (value === null || value === undefined)
        return new Response(null, { status: 204 });
    if (typeof value === "string")
        return new Response(value, {
            headers: { "content-type": "text/plain; charset=utf-8" },
        });
    return Response.json(value);
}
export const Res = {
    json(data, status = 200) {
        return Response.json(data, { status });
    },
    text(body, status = 200) {
        return new Response(body, {
            status,
            headers: { "content-type": "text/plain; charset=utf-8" },
        });
    },
    created(data) {
        if (data === undefined)
            return new Response(null, { status: 201 });
        return Response.json(data, { status: 201 });
    },
    noContent() {
        return new Response(null, { status: 204 });
    },
    unauthorized(message = "Unauthorized") {
        return Response.json({ error: message }, { status: 401 });
    },
    forbidden(message = "Forbidden") {
        return Response.json({ error: message }, { status: 403 });
    },
    notFound(message = "Not Found") {
        return Response.json({ error: message }, { status: 404 });
    },
    error(message = "Internal Server Error", status = 500) {
        return Response.json({ error: message }, { status });
    },
    redirect(url, status = 302) {
        return new Response(null, {
            status,
            headers: { location: url },
        });
    },
};
//# sourceMappingURL=response.js.map
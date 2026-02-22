export function toResponse(value: unknown): Response {
  if (value instanceof Response) return value;
  if (value === null || value === undefined) return new Response(null, { status: 204 });
  if (typeof value === "string") return new Response(value, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
  return Response.json(value);
}

export const Res = {
  json(data: unknown, status = 200): Response {
    return Response.json(data, { status });
  },

  text(body: string, status = 200): Response {
    return new Response(body, {
      status,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  },

  created(data?: unknown): Response {
    if (data === undefined) return new Response(null, { status: 201 });
    return Response.json(data, { status: 201 });
  },

  noContent(): Response {
    return new Response(null, { status: 204 });
  },

  unauthorized(message = "Unauthorized"): Response {
    return Response.json({ error: message }, { status: 401 });
  },

  forbidden(message = "Forbidden"): Response {
    return Response.json({ error: message }, { status: 403 });
  },

  notFound(message = "Not Found"): Response {
    return Response.json({ error: message }, { status: 404 });
  },

  error(message = "Internal Server Error", status = 500): Response {
    return Response.json({ error: message }, { status });
  },

  redirect(url: string, status: 301 | 302 | 307 | 308 = 302): Response {
    return new Response(null, {
      status,
      headers: { location: url },
    });
  },
};

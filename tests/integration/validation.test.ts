import { describe, it, expect, afterEach } from "vitest";
import { jsx } from "../../src/jsx-runtime.js";
import { serve } from "../../src/index.js";
import { App } from "../../src/components/App.js";
import { Controller } from "../../src/components/Controller.js";
import { Middleware } from "../../src/components/Middleware.js";
import { Res } from "../../src/response.js";
import { v } from "../../src/validation.js";
import type { JsxpressRequest, NextFunction } from "../../src/types.js";
import type { ServerHandle } from "../../src/server/types.js";

class ValidatedUsers extends Controller {
  name = "users";

  schema = {
    post: {
      body: v.object({
        name: v.string().min(1),
        email: v.string().email(),
        age: v.number().optional(),
      }),
    },
    get: {
      query: v.object({
        page: v.number().optional(),
        limit: v.number().max(100).optional(),
      }),
    },
  };

  async post(req: JsxpressRequest) {
    return Res.created(req.body);
  }

  get(req: JsxpressRequest) {
    return { page: req.query.get("page") ?? "1" };
  }
}

class NoSchemaController extends Controller {
  name = "plain";
  get() {
    return { ok: true };
  }
}

class AuthMiddleware extends Middleware {
  async handle(req: JsxpressRequest, next: NextFunction) {
    if (!req.headers.get("authorization")) {
      return Res.unauthorized();
    }
    return next();
  }
}

let handle: ServerHandle | undefined;

afterEach(async () => {
  if (handle) {
    await handle.close();
    handle = undefined;
  }
});

describe("validation integration", () => {
  it("returns 422 with structured errors for invalid body", async () => {
    const tree = jsx(App, { port: 0, children: jsx(ValidatedUsers, {}) });
    handle = await serve(tree);

    const res = await fetch(`http://localhost:${handle.port}/users`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "", email: "bad" }),
    });

    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.errors).toEqual([
      { field: "body.name", message: "Must be at least 1 characters" },
      { field: "body.email", message: "Invalid email format" },
    ]);
  });

  it("passes valid body to handler via req.body", async () => {
    const tree = jsx(App, { port: 0, children: jsx(ValidatedUsers, {}) });
    handle = await serve(tree);

    const body = { name: "Alice", email: "alice@example.com", age: 30 };
    const res = await fetch(`http://localhost:${handle.port}/users`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(body);
  });

  it("returns 422 for missing required fields", async () => {
    const tree = jsx(App, { port: 0, children: jsx(ValidatedUsers, {}) });
    handle = await serve(tree);

    const res = await fetch(`http://localhost:${handle.port}/users`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.errors).toContainEqual({
      field: "body.name",
      message: "Required",
    });
    expect(data.errors).toContainEqual({
      field: "body.email",
      message: "Required",
    });
  });

  it("returns 422 for non-JSON body", async () => {
    const tree = jsx(App, { port: 0, children: jsx(ValidatedUsers, {}) });
    handle = await serve(tree);

    const res = await fetch(`http://localhost:${handle.port}/users`, {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "not json",
    });

    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.errors).toEqual([
      { field: "body", message: "Invalid JSON" },
    ]);
  });

  it("validates query params", async () => {
    const tree = jsx(App, { port: 0, children: jsx(ValidatedUsers, {}) });
    handle = await serve(tree);

    const res = await fetch(
      `http://localhost:${handle.port}/users?limit=200`
    );

    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.errors).toEqual([
      { field: "query.limit", message: "Must be at most 100" },
    ]);
  });

  it("passes valid query params", async () => {
    const tree = jsx(App, { port: 0, children: jsx(ValidatedUsers, {}) });
    handle = await serve(tree);

    const res = await fetch(
      `http://localhost:${handle.port}/users?page=2&limit=50`
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ page: "2" });
  });

  it("controller without schema works as before", async () => {
    const tree = jsx(App, { port: 0, children: jsx(NoSchemaController, {}) });
    handle = await serve(tree);

    const res = await fetch(`http://localhost:${handle.port}/plain`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("optional fields work correctly", async () => {
    const tree = jsx(App, { port: 0, children: jsx(ValidatedUsers, {}) });
    handle = await serve(tree);

    const body = { name: "Bob", email: "bob@example.com" };
    const res = await fetch(`http://localhost:${handle.port}/users`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(body);
  });

  it("validation runs after middleware", async () => {
    const tree = jsx(App, {
      port: 0,
      children: jsx(AuthMiddleware, {
        children: jsx(ValidatedUsers, {}),
      }),
    });
    handle = await serve(tree);

    // Without auth header — middleware rejects first
    const res1 = await fetch(`http://localhost:${handle.port}/users`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res1.status).toBe(401);

    // With auth header + invalid body — validation rejects
    const res2 = await fetch(`http://localhost:${handle.port}/users`, {
      method: "POST",
      headers: {
        authorization: "Bearer token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ name: "" }),
    });
    expect(res2.status).toBe(422);
  });
});

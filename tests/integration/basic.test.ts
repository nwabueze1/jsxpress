import { describe, it, expect, afterEach } from "vitest";
import { jsx } from "../../src/jsx-runtime.js";
import { serve } from "../../src/index.js";
import { App } from "../../src/components/App.js";
import { Controller } from "../../src/components/Controller.js";
import { Middleware } from "../../src/components/Middleware.js";
import { Res } from "../../src/response.js";
import type { JsxpressRequest, NextFunction } from "../../src/types.js";
import type { ServerHandle } from "../../src/server/types.js";

class Users extends Controller {
  name = "users";
  get() { return { users: [] }; }
  post() { return Res.created({ id: 1 }); }
}

class Health extends Controller {
  name = "/health";
  get() { return { status: "ok" }; }
}

class Auth extends Middleware {
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

describe("integration", () => {
  it("serves a basic GET route", async () => {
    const tree = jsx(App, {
      port: 0,
      children: jsx(Users, {}),
    });
    handle = await serve(tree);

    const res = await fetch(`http://localhost:${handle.port}/users`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ users: [] });
  });

  it("serves a POST route", async () => {
    const tree = jsx(App, {
      port: 0,
      children: jsx(Users, {}),
    });
    handle = await serve(tree);

    const res = await fetch(`http://localhost:${handle.port}/users`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "test" }),
    });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: 1 });
  });

  it("returns 404 for unknown routes", async () => {
    const tree = jsx(App, {
      port: 0,
      children: jsx(Users, {}),
    });
    handle = await serve(tree);

    const res = await fetch(`http://localhost:${handle.port}/nope`);
    expect(res.status).toBe(404);
  });

  it("applies middleware", async () => {
    const tree = jsx(App, {
      port: 0,
      children: jsx(Auth, {
        children: jsx(Users, {}),
      }),
    });
    handle = await serve(tree);

    // Without auth header
    const res1 = await fetch(`http://localhost:${handle.port}/users`);
    expect(res1.status).toBe(401);

    // With auth header
    const res2 = await fetch(`http://localhost:${handle.port}/users`, {
      headers: { authorization: "Bearer token" },
    });
    expect(res2.status).toBe(200);
    expect(await res2.json()).toEqual({ users: [] });
  });

  it("handles absolute path controllers", async () => {
    const tree = jsx(App, {
      port: 0,
      children: jsx(Health, {}),
    });
    handle = await serve(tree);

    const res = await fetch(`http://localhost:${handle.port}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});

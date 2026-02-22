import { describe, it, expect } from "vitest";
import { executeChain } from "../src/middleware.js";
import type { JsxpressRequest, MiddlewareHandler } from "../src/types.js";

function mockReq(): JsxpressRequest {
  const raw = new Request("http://localhost/test");
  return {
    raw,
    method: "GET",
    path: "/test",
    params: {},
    query: new URLSearchParams(),
    headers: raw.headers,
    json: () => raw.json(),
    text: () => raw.text(),
  };
}

describe("executeChain", () => {
  it("calls the handler when no middleware", async () => {
    const res = await executeChain([], () => ({ ok: true }), mockReq());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("middleware can call next() to proceed", async () => {
    const mw: MiddlewareHandler = async (_req, next) => next();
    const res = await executeChain([mw], () => ({ ok: true }), mockReq());
    expect(await res.json()).toEqual({ ok: true });
  });

  it("middleware can short-circuit", async () => {
    const mw: MiddlewareHandler = async () =>
      Response.json({ error: "blocked" }, { status: 403 });
    const res = await executeChain([mw], () => ({ ok: true }), mockReq());
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "blocked" });
  });

  it("middleware executes in order (onion model)", async () => {
    const order: string[] = [];

    const mw1: MiddlewareHandler = async (_req, next) => {
      order.push("mw1-before");
      const res = await next();
      order.push("mw1-after");
      return res;
    };

    const mw2: MiddlewareHandler = async (_req, next) => {
      order.push("mw2-before");
      const res = await next();
      order.push("mw2-after");
      return res;
    };

    await executeChain([mw1, mw2], () => {
      order.push("handler");
      return { ok: true };
    }, mockReq());

    expect(order).toEqual([
      "mw1-before",
      "mw2-before",
      "handler",
      "mw2-after",
      "mw1-after",
    ]);
  });

  it("supports async handlers", async () => {
    const res = await executeChain(
      [],
      async () => {
        await new Promise((r) => setTimeout(r, 5));
        return { async: true };
      },
      mockReq()
    );
    expect(await res.json()).toEqual({ async: true });
  });
});

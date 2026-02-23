import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RateLimit } from "../src/rate-limit/rate-limit.js";
import { MemoryRateLimitStore, CacheRateLimitStore } from "../src/rate-limit/store.js";
import { MemoryAdapter } from "../src/cache/adapters/memory.js";
import type { JsxpressRequest, NextFunction } from "../src/types.js";

function mockRequest(ip?: string): JsxpressRequest {
  const headers = new Headers();
  if (ip) headers.set("x-forwarded-for", ip);
  return {
    raw: new Request("http://localhost/test"),
    method: "GET",
    path: "/test",
    params: {},
    query: new URLSearchParams(),
    headers,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(""),
    formData: () => Promise.resolve({ fields: {}, files: [] }),
  } as JsxpressRequest;
}

function mockNext(): NextFunction {
  return () => Promise.resolve(new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  }));
}

describe("RateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit", async () => {
    const limiter = new RateLimit({ windowMs: 60000, max: 5 });
    const req = mockRequest("1.2.3.4");
    const res = await limiter.handle(req, mockNext());
    expect(res.status).toBe(200);
  });

  it("blocks requests over the limit with 429", async () => {
    const limiter = new RateLimit({ windowMs: 60000, max: 2 });
    const req = mockRequest("1.2.3.4");

    await limiter.handle(req, mockNext());
    await limiter.handle(req, mockNext());
    const res = await limiter.handle(req, mockNext());
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe("Too Many Requests");
  });

  it("uses custom message when provided", async () => {
    const limiter = new RateLimit({ windowMs: 60000, max: 1, message: "Slow down!" });
    const req = mockRequest("1.2.3.4");

    await limiter.handle(req, mockNext());
    const res = await limiter.handle(req, mockNext());
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe("Slow down!");
  });

  it("includes rate limit headers on successful responses", async () => {
    const limiter = new RateLimit({ windowMs: 60000, max: 10 });
    const req = mockRequest("1.2.3.4");
    const res = await limiter.handle(req, mockNext());

    expect(res.headers.get("X-RateLimit-Limit")).toBe("10");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("9");
    expect(res.headers.get("X-RateLimit-Reset")).toBeTruthy();
  });

  it("X-RateLimit-Remaining decrements with each request", async () => {
    const limiter = new RateLimit({ windowMs: 60000, max: 5 });
    const req = mockRequest("1.2.3.4");

    const res1 = await limiter.handle(req, mockNext());
    expect(res1.headers.get("X-RateLimit-Remaining")).toBe("4");

    const res2 = await limiter.handle(req, mockNext());
    expect(res2.headers.get("X-RateLimit-Remaining")).toBe("3");

    const res3 = await limiter.handle(req, mockNext());
    expect(res3.headers.get("X-RateLimit-Remaining")).toBe("2");
  });

  it("resets after windowMs", async () => {
    const limiter = new RateLimit({ windowMs: 60000, max: 2 });
    const req = mockRequest("1.2.3.4");

    await limiter.handle(req, mockNext());
    await limiter.handle(req, mockNext());
    const blocked = await limiter.handle(req, mockNext());
    expect(blocked.status).toBe(429);

    vi.advanceTimersByTime(60001);

    const allowed = await limiter.handle(req, mockNext());
    expect(allowed.status).toBe(200);
  });

  it("uses custom keyFn", async () => {
    const limiter = new RateLimit({
      windowMs: 60000,
      max: 1,
      keyFn: () => "global",
    });

    const req1 = mockRequest("1.1.1.1");
    const req2 = mockRequest("2.2.2.2");

    await limiter.handle(req1, mockNext());
    const res = await limiter.handle(req2, mockNext());
    expect(res.status).toBe(429);
  });

  it("tracks different IPs independently", async () => {
    const limiter = new RateLimit({ windowMs: 60000, max: 1 });

    const req1 = mockRequest("1.1.1.1");
    const req2 = mockRequest("2.2.2.2");

    const res1 = await limiter.handle(req1, mockNext());
    expect(res1.status).toBe(200);

    const res2 = await limiter.handle(req2, mockNext());
    expect(res2.status).toBe(200);

    const res3 = await limiter.handle(req1, mockNext());
    expect(res3.status).toBe(429);
  });

  it("includes rate limit headers on 429 responses", async () => {
    const limiter = new RateLimit({ windowMs: 60000, max: 1 });
    const req = mockRequest("1.2.3.4");

    await limiter.handle(req, mockNext());
    const res = await limiter.handle(req, mockNext());
    expect(res.status).toBe(429);
    expect(res.headers.get("X-RateLimit-Limit")).toBe("1");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(res.headers.get("X-RateLimit-Reset")).toBeTruthy();
  });
});

describe("CacheRateLimitStore", () => {
  it("works with MemoryAdapter", async () => {
    const cache = new MemoryAdapter();
    const store = new CacheRateLimitStore(cache);

    const r1 = await store.increment("test", 60000);
    expect(r1.count).toBe(1);

    const r2 = await store.increment("test", 60000);
    expect(r2.count).toBe(2);

    await store.reset("test");
    const r3 = await store.increment("test", 60000);
    expect(r3.count).toBe(1);

    await cache.close();
  });
});

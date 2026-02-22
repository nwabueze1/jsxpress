import { describe, it, expect } from "vitest";
import { toResponse, Res } from "../src/response.js";

describe("toResponse", () => {
  it("passes through Response objects", () => {
    const res = new Response("ok");
    expect(toResponse(res)).toBe(res);
  });

  it("converts null to 204", () => {
    const res = toResponse(null);
    expect(res.status).toBe(204);
  });

  it("converts undefined to 204", () => {
    const res = toResponse(undefined);
    expect(res.status).toBe(204);
  });

  it("converts strings to text response", async () => {
    const res = toResponse("hello");
    expect(res.headers.get("content-type")).toContain("text/plain");
    expect(await res.text()).toBe("hello");
  });

  it("converts objects to JSON response", async () => {
    const res = toResponse({ foo: "bar" });
    const body = await res.json();
    expect(body).toEqual({ foo: "bar" });
  });
});

describe("Res helpers", () => {
  it("json() creates JSON response with status", async () => {
    const res = Res.json({ ok: true }, 201);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("text() creates text response", async () => {
    const res = Res.text("hello", 200);
    expect(await res.text()).toBe("hello");
  });

  it("created() with data", async () => {
    const res = Res.created({ id: 1 });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: 1 });
  });

  it("created() without data", () => {
    const res = Res.created();
    expect(res.status).toBe(201);
  });

  it("noContent() returns 204", () => {
    expect(Res.noContent().status).toBe(204);
  });

  it("unauthorized()", async () => {
    const res = Res.unauthorized();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("forbidden()", async () => {
    const res = Res.forbidden();
    expect(res.status).toBe(403);
  });

  it("notFound()", async () => {
    const res = Res.notFound();
    expect(res.status).toBe(404);
  });

  it("error()", async () => {
    const res = Res.error("Oops", 503);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "Oops" });
  });

  it("redirect()", () => {
    const res = Res.redirect("/login");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/login");
  });

  it("redirect() with custom status", () => {
    const res = Res.redirect("/new-url", 301);
    expect(res.status).toBe(301);
  });
});

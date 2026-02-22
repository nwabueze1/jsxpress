import { describe, it, expect } from "vitest";
import { Router } from "../src/router.js";
import type { RouteTable, Route, HttpMethod } from "../src/types.js";

function makeRoute(path: string, method: HttpMethod): Route {
  return {
    path,
    method,
    handler: () => ({ ok: true }),
    middlewareChain: [],
  };
}

function makeTable(routes: Route[]): RouteTable {
  const table: RouteTable = new Map();
  for (const route of routes) {
    if (!table.has(route.path)) table.set(route.path, new Map());
    table.get(route.path)!.set(route.method, route);
  }
  return table;
}

describe("Router", () => {
  it("matches an exact route", () => {
    const route = makeRoute("/users", "GET");
    const router = new Router(makeTable([route]));

    expect(router.match("/users", "GET")).toBe(route);
  });

  it("returns null for unknown paths", () => {
    const router = new Router(makeTable([makeRoute("/users", "GET")]));
    expect(router.match("/posts", "GET")).toBeNull();
  });

  it("returns null for wrong method", () => {
    const router = new Router(makeTable([makeRoute("/users", "GET")]));
    expect(router.match("/users", "POST")).toBeNull();
  });

  it("differentiates methods on the same path", () => {
    const get = makeRoute("/users", "GET");
    const post = makeRoute("/users", "POST");
    const router = new Router(makeTable([get, post]));

    expect(router.match("/users", "GET")).toBe(get);
    expect(router.match("/users", "POST")).toBe(post);
  });
});

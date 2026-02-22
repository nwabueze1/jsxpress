import { describe, it, expect } from "vitest";
import { jsx } from "../src/jsx-runtime.js";
import { Fragment } from "../src/jsx-runtime.js";
import { compileTree } from "../src/tree.js";
import { Controller } from "../src/components/Controller.js";
import { Middleware } from "../src/components/Middleware.js";
import { App } from "../src/components/App.js";
import type { JsxpressRequest, NextFunction } from "../src/types.js";

class Users extends Controller {
  name = "users";
  get() { return { users: [] }; }
  post(req: JsxpressRequest) { return { id: 1 }; }
}

class Posts extends Controller {
  name = "posts";
  get() { return { posts: [] }; }
}

class Health extends Controller {
  name = "/health";
  get() { return { ok: true }; }
}

class Auth extends Middleware {
  async handle(req: JsxpressRequest, next: NextFunction) {
    return next();
  }
}

class Logger extends Middleware {
  async handle(req: JsxpressRequest, next: NextFunction) {
    return next();
  }
}

describe("compileTree", () => {
  it("registers routes for a simple controller", () => {
    const tree = jsx(App, { children: jsx(Users, {}) });
    const { table } = compileTree(tree);

    expect(table.has("/users")).toBe(true);
    expect(table.get("/users")!.has("GET")).toBe(true);
    expect(table.get("/users")!.has("POST")).toBe(true);
    expect(table.get("/users")!.has("DELETE")).toBe(false);
  });

  it("handles multiple controllers", () => {
    const tree = jsx(App, {
      children: [jsx(Users, {}), jsx(Posts, {})],
    });
    const { table } = compileTree(tree);

    expect(table.has("/users")).toBe(true);
    expect(table.has("/posts")).toBe(true);
  });

  it("supports absolute paths (starting with /)", () => {
    const tree = jsx(App, { children: jsx(Health, {}) });
    const { table } = compileTree(tree);

    expect(table.has("/health")).toBe(true);
  });

  it("attaches middleware to routes", () => {
    const tree = jsx(App, {
      children: jsx(Auth, {
        children: jsx(Users, {}),
      }),
    });
    const { table } = compileTree(tree);

    const getRoute = table.get("/users")!.get("GET")!;
    expect(getRoute.middlewareChain).toHaveLength(1);
  });

  it("stacks multiple middleware", () => {
    const tree = jsx(App, {
      children: jsx(Logger, {
        children: jsx(Auth, {
          children: jsx(Users, {}),
        }),
      }),
    });
    const { table } = compileTree(tree);

    const getRoute = table.get("/users")!.get("GET")!;
    expect(getRoute.middlewareChain).toHaveLength(2);
  });

  it("middleware does not leak to siblings", () => {
    const tree = jsx(App, {
      children: [
        jsx(Auth, { children: jsx(Users, {}) }),
        jsx(Posts, {}),
      ],
    });
    const { table } = compileTree(tree);

    expect(table.get("/users")!.get("GET")!.middlewareChain).toHaveLength(1);
    expect(table.get("/posts")!.get("GET")!.middlewareChain).toHaveLength(0);
  });

  it("Fragment is transparent", () => {
    const tree = jsx(App, {
      children: jsx(Fragment, {
        children: [jsx(Users, {}), jsx(Posts, {})],
      }),
    });
    const { table } = compileTree(tree);

    expect(table.has("/users")).toBe(true);
    expect(table.has("/posts")).toBe(true);
  });

  it("supports nested controllers (children)", () => {
    class Comments extends Controller {
      name = "comments";
      get() { return { comments: [] }; }
    }

    const tree = jsx(App, {
      children: jsx(Posts, {
        children: jsx(Comments, {}),
      }),
    });
    const { table } = compileTree(tree);

    expect(table.has("/posts")).toBe(true);
    expect(table.has("/posts/comments")).toBe(true);
  });
});

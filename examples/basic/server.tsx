import { serve, App, Controller, Middleware, Res } from "../../src/index.js";
import type { JsxpressRequest, NextFunction } from "../../src/types.js";

// Middleware: logs every request
class Logger extends Middleware {
  async handle(req: JsxpressRequest, next: NextFunction) {
    const start = Date.now();
    const res = await next();
    console.log(`${req.method} ${req.path} → ${res.status} (${Date.now() - start}ms)`);
    return res;
  }
}

// Middleware: requires Authorization header
class Auth extends Middleware {
  async handle(req: JsxpressRequest, next: NextFunction) {
    if (!req.headers.get("authorization")) {
      return Res.unauthorized();
    }
    return next();
  }
}

// Controller: GET /health
class Health extends Controller {
  name = "/health";
  get() {
    return { status: "ok", uptime: process.uptime() };
  }
}

// Controller: GET /users, POST /users
class Users extends Controller {
  name = "users";
  get() {
    return { users: [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }] };
  }
  post(req: JsxpressRequest) {
    return Res.created({ id: 3, name: "New User" });
  }
}

// Controller: GET /posts, POST /posts
class Posts extends Controller {
  name = "posts";
  get() {
    return { posts: [{ id: 1, title: "Hello World" }] };
  }
  post() {
    return Res.created({ id: 2, title: "New Post" });
  }
}

serve(
  <App port={3000}>
    <Logger>
      <Health />
      <Auth>
        <Users />
        <Posts />
      </Auth>
    </Logger>
  </App>
);

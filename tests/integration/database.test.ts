import { describe, it, expect, afterEach } from "vitest";
import { jsx } from "../../src/jsx-runtime.js";
import { serve } from "../../src/index.js";
import { App } from "../../src/components/App.js";
import { Database } from "../../src/db/database.js";
import { Controller } from "../../src/components/Controller.js";
import { Repository } from "../../src/db/repository.js";
import { Model } from "../../src/db/model.js";
import { Field } from "../../src/db/field.js";
import { Res } from "../../src/response.js";
import type { JsxpressRequest } from "../../src/types.js";
import type { ServerHandle } from "../../src/server/types.js";
import { unlinkSync } from "node:fs";

class User extends Model {
  static table = "users";
  static schema = {
    id: Field.serial().primaryKey(),
    name: Field.text().notNull(),
    email: Field.text().unique(),
  };
}

class UserRepository extends Repository {
  async findAll() {
    return User.query(this.db).findAll();
  }

  async create(data: { name: string; email: string }) {
    return User.query(this.db).create(data);
  }

  async findById(id: number) {
    return User.query(this.db).where("id", id).findOne();
  }

  async deleteById(id: number) {
    return User.query(this.db).where("id", id).delete();
  }
}

class Users extends Controller {
  name = "users";

  async get() {
    const users = await this.repo(UserRepository).findAll();
    return { users };
  }

  async post(req: JsxpressRequest) {
    const data = (await req.json()) as { name: string; email: string };
    const user = await this.repo(UserRepository).create(data);
    return Res.created(user);
  }
}

class UserById extends Controller {
  name = ":id";

  async get(req: JsxpressRequest) {
    const id = Number(req.params.id || req.path.split("/").pop());
    const user = await this.repo(UserRepository).findById(id);
    if (!user) return Res.notFound();
    return user;
  }

  async delete(req: JsxpressRequest) {
    const id = Number(req.params.id || req.path.split("/").pop());
    await this.repo(UserRepository).deleteById(id);
    return Res.noContent();
  }
}

const DB_PATH = "./test-integration.db";
let handle: ServerHandle | undefined;

afterEach(async () => {
  if (handle) {
    await handle.close();
    handle = undefined;
  }
  try { unlinkSync(DB_PATH); } catch {}
});

describe("database integration", () => {
  it("creates tables on startup and handles CRUD", async () => {
    const tree = jsx(App, {
      port: 0,
      children: jsx(Database, {
        dialect: "sqlite",
        url: DB_PATH,
        models: [User],
        children: jsx(Users, {}),
      }),
    });

    handle = await serve(tree);
    const base = `http://localhost:${handle.port}`;

    // GET /users — empty
    const res1 = await fetch(`${base}/users`);
    expect(res1.status).toBe(200);
    expect(await res1.json()).toEqual({ users: [] });

    // POST /users — create
    const res2 = await fetch(`${base}/users`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Alice", email: "alice@test.com" }),
    });
    expect(res2.status).toBe(201);
    const created = await res2.json();
    expect(created).toMatchObject({ name: "Alice", email: "alice@test.com" });
    expect(created.id).toBeDefined();

    // GET /users — has Alice
    const res3 = await fetch(`${base}/users`);
    const { users } = await res3.json();
    expect(users).toHaveLength(1);
    expect(users[0].name).toBe("Alice");

    // POST another user
    await fetch(`${base}/users`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Bob", email: "bob@test.com" }),
    });

    // GET /users — has both
    const res4 = await fetch(`${base}/users`);
    const data4 = await res4.json();
    expect(data4.users).toHaveLength(2);
  });

  it("database shuts down cleanly on close", async () => {
    const tree = jsx(App, {
      port: 0,
      children: jsx(Database, {
        dialect: "sqlite",
        url: DB_PATH,
        models: [User],
        children: jsx(Users, {}),
      }),
    });

    handle = await serve(tree);
    await handle.close();
    handle = undefined;

    // Should not throw — DB is cleanly closed
  });
});

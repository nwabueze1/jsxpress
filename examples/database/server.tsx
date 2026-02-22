import { serve, App, Database, DatabaseController, Model, Field, Res } from "../../src/index.js";
import type { JsxpressRequest } from "../../src/types.js";

// Models

class User extends Model {
  static table = "users";
  static schema = {
    id: Field.serial().primaryKey(),
    name: Field.text().notNull(),
    email: Field.text().unique(),
  };
}

class Post extends Model {
  static table = "posts";
  static schema = {
    id: Field.serial().primaryKey(),
    title: Field.text().notNull(),
    body: Field.text(),
    userId: Field.integer().notNull(),
  };
}

// Controllers

class Users extends DatabaseController {
  name = "users";

  async get() {
    const users = await User.query(this.db).findAll();
    return { users };
  }

  async post(req: JsxpressRequest) {
    const data = (await req.json()) as { name: string; email: string };
    const user = await User.query(this.db).create(data);
    return Res.created(user);
  }
}

class Posts extends DatabaseController {
  name = "posts";

  async get() {
    const posts = await Post.query(this.db).orderBy("id", "desc").findAll();
    return { posts };
  }

  async post(req: JsxpressRequest) {
    const data = (await req.json()) as { title: string; body: string; userId: number };
    const post = await Post.query(this.db).create(data);
    return Res.created(post);
  }
}

// App

serve(
  <App port={3000}>
    <Database dialect="sqlite" url="./example.db" models={[User, Post]}>
      <Users />
      <Posts />
    </Database>
  </App>
);

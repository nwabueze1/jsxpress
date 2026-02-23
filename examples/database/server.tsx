import { serve, App, Database, Controller, Repository, Model, Field, Res, hasMany, belongsTo } from "../../src/index.js";
import type { RelationDefinition } from "../../src/index.js";
import type { JsxpressRequest } from "../../src/types.js";

// Models

class User extends Model {
  static table = "users";
  static schema = {
    id: Field.serial().primaryKey(),
    name: Field.text().notNull(),
    email: Field.text().unique(),
  };
  static relations: Record<string, RelationDefinition> = {
    posts: hasMany(() => Post, "userId"),
  };
}

class Post extends Model {
  static table = "posts";
  static schema = {
    id: Field.serial().primaryKey(),
    title: Field.text().notNull(),
    body: Field.text(),
    userId: Field.integer().notNull().references(User, { onDelete: "cascade" }),
  };
  static relations: Record<string, RelationDefinition> = {
    author: belongsTo(() => User, "userId"),
  };
}

// Repositories

class UserRepository extends Repository {
  async findAll() {
    return User.query(this.db).findAll();
  }

  async findAllWithPosts() {
    return User.query(this.db).include("posts").findAll();
  }

  async create(data: { name: string; email: string }) {
    return User.query(this.db).create(data);
  }
}

class PostRepository extends Repository {
  async findAll() {
    return Post.query(this.db).orderBy("id", "desc").findAll();
  }

  async findAllWithAuthor() {
    return Post.query(this.db).include("author").orderBy("id", "desc").findAll();
  }

  async create(data: { title: string; body: string; userId: number }) {
    return Post.query(this.db).create(data);
  }
}

// Controllers

class Users extends Controller {
  name = "users";

  async get() {
    const users = await this.repo(UserRepository).findAllWithPosts();
    return { users };
  }

  async post(req: JsxpressRequest) {
    const data = (await req.json()) as { name: string; email: string };
    const user = await this.repo(UserRepository).create(data);
    return Res.created(user);
  }
}

class Posts extends Controller {
  name = "posts";

  async get() {
    const posts = await this.repo(PostRepository).findAllWithAuthor();
    return { posts };
  }

  async post(req: JsxpressRequest) {
    const data = (await req.json()) as { title: string; body: string; userId: number };
    const post = await this.repo(PostRepository).create(data);
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

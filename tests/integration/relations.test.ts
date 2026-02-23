import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Model } from "../../src/db/model.js";
import { Field } from "../../src/db/field.js";
import { hasMany, hasOne, belongsTo } from "../../src/db/relations.js";
import { SqliteAdapter } from "../../src/db/adapters/sqlite.js";
import { unlinkSync } from "node:fs";

const DB_PATH = "./test-relations.db";

class User extends Model {
  static table = "users";
  static schema = {
    id: Field.serial().primaryKey(),
    name: Field.text().notNull(),
  };
  static relations = {
    posts: hasMany(() => Post, "userId"),
    profile: hasOne(() => Profile, "userId"),
  };
}

class Post extends Model {
  static table = "posts";
  static schema = {
    id: Field.serial().primaryKey(),
    title: Field.text().notNull(),
    userId: Field.integer().notNull().references(User, { onDelete: "cascade" }),
  };
  static relations = {
    author: belongsTo(() => User, "userId"),
  };
}

class Profile extends Model {
  static table = "profiles";
  static schema = {
    id: Field.serial().primaryKey(),
    bio: Field.text(),
    userId: Field.integer().notNull().references(User, { onDelete: "cascade" }),
  };
}

let db: SqliteAdapter;

beforeAll(async () => {
  db = new SqliteAdapter(DB_PATH);
  await db.connect();
  // Create tables in dependency order
  await User.syncTable(db);
  await Post.syncTable(db);
  await Profile.syncTable(db);
});

afterAll(async () => {
  await db.close();
  try { unlinkSync(DB_PATH); } catch {}
});

describe("relations integration", () => {
  it("creates tables with FK constraints", async () => {
    // If FK constraints are generated, this table creation succeeded
    const result = await db.raw("PRAGMA table_info(posts)");
    const cols = result.rows.map((r) => r.name);
    expect(cols).toContain("userId");
  });

  it("inserts and queries with hasMany include", async () => {
    const alice = await User.query(db).create({ name: "Alice" });
    const bob = await User.query(db).create({ name: "Bob" });

    await Post.query(db).create({ title: "Alice Post 1", userId: (alice as any).id });
    await Post.query(db).create({ title: "Alice Post 2", userId: (alice as any).id });
    await Post.query(db).create({ title: "Bob Post 1", userId: (bob as any).id });

    const users = await User.query(db).include("posts").findAll();
    expect(users).toHaveLength(2);

    const aliceResult = users.find((u: any) => u.name === "Alice") as any;
    expect(aliceResult.posts).toHaveLength(2);
    expect(aliceResult.posts[0].title).toBe("Alice Post 1");

    const bobResult = users.find((u: any) => u.name === "Bob") as any;
    expect(bobResult.posts).toHaveLength(1);
  });

  it("queries with hasOne include", async () => {
    const users = await User.query(db).findAll();
    const alice = users.find((u: any) => u.name === "Alice") as any;

    await Profile.query(db).create({ bio: "Hello world", userId: alice.id });

    const usersWithProfiles = await User.query(db).include("profile").findAll();
    const aliceWithProfile = usersWithProfiles.find((u: any) => u.name === "Alice") as any;
    expect(aliceWithProfile.profile).toBeDefined();
    expect(aliceWithProfile.profile.bio).toBe("Hello world");

    const bobWithProfile = usersWithProfiles.find((u: any) => u.name === "Bob") as any;
    expect(bobWithProfile.profile).toBeNull();
  });

  it("queries with belongsTo include", async () => {
    const posts = await Post.query(db).include("author").findAll();
    expect(posts.length).toBeGreaterThan(0);

    const post = posts[0] as any;
    expect(post.author).toBeDefined();
    expect(post.author.name).toBeDefined();
  });

  it("enforces FK constraints (insert with bad FK fails)", async () => {
    await expect(
      Post.query(db).create({ title: "Orphan", userId: 9999 }),
    ).rejects.toThrow();
  });

  it("cascades deletes via FK", async () => {
    // Delete Alice — her posts and profile should be cascaded
    const users = await User.query(db).findAll();
    const alice = users.find((u: any) => u.name === "Alice") as any;

    await User.query(db).where("id", alice.id).delete();

    const remainingPosts = await Post.query(db).where("userId", alice.id).findAll();
    expect(remainingPosts).toHaveLength(0);

    const remainingProfiles = await Profile.query(db).where("userId", alice.id).findAll();
    expect(remainingProfiles).toHaveLength(0);
  });
});

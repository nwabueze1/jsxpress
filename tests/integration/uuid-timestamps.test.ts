import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Model } from "../../src/db/model.js";
import { Field } from "../../src/db/field.js";
import { createDatabaseAdapter } from "../../src/db/create-adapter.js";
import type { DatabaseAdapter } from "../../src/db/adapter.js";
import { unlinkSync } from "node:fs";

const DB_PATH = "./test-uuid-timestamps.db";

let db: DatabaseAdapter;

beforeEach(async () => {
  db = createDatabaseAdapter("sqlite", DB_PATH);
  await db.connect();
});

afterEach(async () => {
  await db.close();
  try { unlinkSync(DB_PATH); } catch {}
});

describe("UUID model", () => {
  class Token extends Model {
    static table = "tokens";
    static schema = {
      id: Field.uuid().primaryKey(),
      value: Field.text().notNull(),
    };
  }

  it("syncTable creates TEXT column for uuid in SQLite", async () => {
    await Token.syncTable(db);
    const result = await db.raw("PRAGMA table_info(tokens)");
    const idCol = result.rows.find((r) => r.name === "id");
    expect(idCol).toBeDefined();
    expect(idCol!.type).toBe("TEXT");
  });

  it("create auto-generates a UUID", async () => {
    await Token.syncTable(db);
    const token = await Token.query(db).create({ value: "abc" });
    expect(typeof token.id).toBe("string");
    expect((token.id as string).length).toBe(36);
    expect(token.value).toBe("abc");
  });

  it("preserves user-supplied UUID", async () => {
    await Token.syncTable(db);
    const customId = "my-custom-uuid-value-here-1234567";
    const token = await Token.query(db).create({ id: customId, value: "xyz" } as any);
    expect(token.id).toBe(customId);
  });

  it("generates unique UUIDs for each row", async () => {
    await Token.syncTable(db);
    const t1 = await Token.query(db).create({ value: "a" });
    const t2 = await Token.query(db).create({ value: "b" });
    expect(t1.id).not.toBe(t2.id);
  });
});

describe("Timestamps model", () => {
  class Article extends Model {
    static table = "articles";
    static timestamps = true;
    static schema = {
      id: Field.serial().primaryKey(),
      title: Field.text().notNull(),
    };
  }

  it("syncTable creates timestamp columns", async () => {
    await Article.syncTable(db);
    const result = await db.raw("PRAGMA table_info(articles)");
    const colNames = result.rows.map((r) => r.name);
    expect(colNames).toContain("created_at");
    expect(colNames).toContain("updated_at");
  });

  it("create auto-sets created_at and updated_at", async () => {
    await Article.syncTable(db);
    const before = new Date().toISOString();
    const article = await Article.query(db).create({ title: "Hello" });
    const after = new Date().toISOString();

    expect(article.created_at).toBeDefined();
    expect(article.updated_at).toBeDefined();
    expect(article.created_at as string >= before).toBe(true);
    expect(article.created_at as string <= after).toBe(true);
  });

  it("update auto-sets updated_at", async () => {
    await Article.syncTable(db);
    const article = await Article.query(db).create({ title: "Hello" });
    const originalUpdatedAt = article.updated_at;

    // Small delay to ensure timestamp difference
    await new Promise((r) => setTimeout(r, 10));

    await Article.query(db).where("id", article.id).update({ title: "Updated" });
    const updated = await Article.query(db).where("id", article.id).findOne();

    expect(updated!.updated_at).not.toBe(originalUpdatedAt);
  });
});

describe("Soft delete model", () => {
  class Post extends Model {
    static table = "posts";
    static timestamps = true;
    static softDelete = true;
    static schema = {
      id: Field.serial().primaryKey(),
      title: Field.text().notNull(),
    };
  }

  it("syncTable creates deleted_at column", async () => {
    await Post.syncTable(db);
    const result = await db.raw("PRAGMA table_info(posts)");
    const colNames = result.rows.map((r) => r.name);
    expect(colNames).toContain("deleted_at");
  });

  it("delete() soft-deletes the row", async () => {
    await Post.syncTable(db);
    await Post.query(db).create({ title: "Post 1" });
    await Post.query(db).where("id", 1).delete();

    // Row still exists in DB
    const raw = await db.raw("SELECT * FROM posts WHERE id = 1");
    expect(raw.rows).toHaveLength(1);
    expect(raw.rows[0].deleted_at).not.toBeNull();
  });

  it("findAll() excludes soft-deleted rows", async () => {
    await Post.syncTable(db);
    await Post.query(db).create({ title: "Post 1" });
    await Post.query(db).create({ title: "Post 2" });
    await Post.query(db).where("id", 1).delete();

    const posts = await Post.query(db).findAll();
    expect(posts).toHaveLength(1);
    expect(posts[0].title).toBe("Post 2");
  });

  it("withTrashed() includes soft-deleted rows", async () => {
    await Post.syncTable(db);
    await Post.query(db).create({ title: "Post 1" });
    await Post.query(db).create({ title: "Post 2" });
    await Post.query(db).where("id", 1).delete();

    const posts = await Post.query(db).withTrashed().findAll();
    expect(posts).toHaveLength(2);
  });

  it("forceDelete() hard-deletes the row", async () => {
    await Post.syncTable(db);
    await Post.query(db).create({ title: "Post 1" });
    await Post.query(db).where("id", 1).forceDelete();

    const raw = await db.raw("SELECT * FROM posts WHERE id = 1");
    expect(raw.rows).toHaveLength(0);
  });

  it("count() excludes soft-deleted rows", async () => {
    await Post.syncTable(db);
    await Post.query(db).create({ title: "Post 1" });
    await Post.query(db).create({ title: "Post 2" });
    await Post.query(db).where("id", 1).delete();

    const count = await Post.query(db).count();
    expect(count).toBe(1);
  });
});

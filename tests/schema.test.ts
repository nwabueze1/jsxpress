import { describe, it, expect } from "vitest";
import { Schema, Blueprint } from "../src/db/schema.js";
import type { DatabaseAdapter, QueryResult, WhereCondition, FindOptions } from "../src/db/adapter.js";
import type { FieldBuilder } from "../src/db/field.js";

function mockAdapter(dialect: "sqlite" | "postgres" | "mysql" = "sqlite") {
  const calls: { sql: string; params: unknown[] }[] = [];

  const adapter: DatabaseAdapter = {
    dialect,
    async connect() {},
    async close() {},
    async find() { return []; },
    async count() { return 0; },
    async insertOne(table: string, data: Record<string, unknown>) { return { id: 1, ...data }; },
    async updateMany() { return 0; },
    async deleteMany() { return 0; },
    async createCollection() {},
    async raw(sql: string, params: unknown[] = []): Promise<QueryResult> {
      calls.push({ sql, params });
      return { rows: [], changes: 0 };
    },
  };

  return { adapter, calls };
}

describe("Blueprint", () => {
  it("collects column operations via chaining", () => {
    const bp = new Blueprint();
    bp.serial("id").primaryKey();
    bp.text("name").notNull();
    bp.integer("age");
    bp.boolean("active").default(true);

    expect(bp.columns).toHaveLength(4);
    expect(bp.columns[0]).toEqual({ kind: "add", name: "id", builder: expect.any(Object) });
  });

  it("timestamps() adds created_at and updated_at", () => {
    const bp = new Blueprint();
    bp.timestamps();

    expect(bp.columns).toHaveLength(2);
    expect(bp.columns[0]).toMatchObject({ kind: "add", name: "created_at" });
    expect(bp.columns[1]).toMatchObject({ kind: "add", name: "updated_at" });
  });

  it("softDeletes() adds deleted_at", () => {
    const bp = new Blueprint();
    bp.softDeletes();

    expect(bp.columns).toHaveLength(1);
    expect(bp.columns[0]).toMatchObject({ kind: "add", name: "deleted_at" });
  });

  it("dropColumn() records a drop operation", () => {
    const bp = new Blueprint();
    bp.dropColumn("old_col");

    expect(bp.columns).toHaveLength(1);
    expect(bp.columns[0]).toEqual({ kind: "drop", name: "old_col" });
  });

  it("renameColumn() records a rename operation", () => {
    const bp = new Blueprint();
    bp.renameColumn("old", "new");

    expect(bp.columns).toHaveLength(1);
    expect(bp.columns[0]).toEqual({ kind: "rename", from: "old", to: "new" });
  });

  it("unique() records a composite unique constraint", () => {
    const bp = new Blueprint();
    bp.unique(["provider", "provider_user_id"]);

    expect(bp.uniqueConstraints).toHaveLength(1);
    expect(bp.uniqueConstraints[0].columns).toEqual(["provider", "provider_user_id"]);
  });

  it("supports all column types", () => {
    const bp = new Blueprint();
    bp.serial("a");
    bp.text("b");
    bp.integer("c");
    bp.boolean("d");
    bp.timestamp("e");
    bp.json("f");
    bp.real("g");
    bp.uuid("h");

    expect(bp.columns).toHaveLength(8);
  });
});

describe("Schema.create", () => {
  it("generates CREATE TABLE for sqlite", async () => {
    const { adapter, calls } = mockAdapter("sqlite");
    const schema = new Schema(adapter);

    schema.create("users", (table) => {
      table.serial("id").primaryKey();
      table.text("name").notNull();
      table.text("email").notNull().unique();
    });

    await schema.execute();

    expect(calls).toHaveLength(1);
    expect(calls[0].sql).toContain('CREATE TABLE IF NOT EXISTS "users"');
    expect(calls[0].sql).toContain('"id" INTEGER PRIMARY KEY');
    expect(calls[0].sql).toContain('"name" TEXT NOT NULL');
    expect(calls[0].sql).toContain('"email" TEXT NOT NULL UNIQUE');
  });

  it("generates CREATE TABLE for postgres", async () => {
    const { adapter, calls } = mockAdapter("postgres");
    const schema = new Schema(adapter);

    schema.create("users", (table) => {
      table.serial("id").primaryKey();
      table.text("name").notNull();
      table.boolean("active").default(true);
    });

    await schema.execute();

    expect(calls).toHaveLength(1);
    expect(calls[0].sql).toContain("SERIAL PRIMARY KEY");
    expect(calls[0].sql).toContain("BOOLEAN");
    expect(calls[0].sql).toContain("DEFAULT true");
  });

  it("generates CREATE TABLE for mysql", async () => {
    const { adapter, calls } = mockAdapter("mysql");
    const schema = new Schema(adapter);

    schema.create("users", (table) => {
      table.serial("id").primaryKey();
      table.text("name").notNull();
    });

    await schema.execute();

    expect(calls).toHaveLength(1);
    expect(calls[0].sql).toContain("`users`");
    expect(calls[0].sql).toContain("`id`");
    expect(calls[0].sql).toContain("INT AUTO_INCREMENT");
  });

  it("includes composite unique constraints", async () => {
    const { adapter, calls } = mockAdapter("sqlite");
    const schema = new Schema(adapter);

    schema.create("oauth_accounts", (table) => {
      table.serial("id").primaryKey();
      table.text("provider").notNull();
      table.text("provider_user_id").notNull();
      table.unique(["provider", "provider_user_id"]);
    });

    await schema.execute();

    expect(calls).toHaveLength(1);
    expect(calls[0].sql).toContain('UNIQUE("provider", "provider_user_id")');
  });

  it("supports foreign key references", async () => {
    const { adapter, calls } = mockAdapter("sqlite");
    const schema = new Schema(adapter);

    schema.create("posts", (table) => {
      table.serial("id").primaryKey();
      table.integer("user_id").notNull().references({ table: "users" }, { onDelete: "cascade" });
    });

    await schema.execute();

    expect(calls[0].sql).toContain('REFERENCES "users"("id")');
    expect(calls[0].sql).toContain("ON DELETE CASCADE");
  });
});

describe("Schema.table (ALTER)", () => {
  it("generates ADD COLUMN statements", async () => {
    const { adapter, calls } = mockAdapter("sqlite");
    const schema = new Schema(adapter);

    schema.table("users", (table) => {
      table.text("bio");
      table.integer("age");
    });

    await schema.execute();

    expect(calls).toHaveLength(2);
    expect(calls[0].sql).toBe('ALTER TABLE "users" ADD COLUMN "bio" TEXT');
    expect(calls[1].sql).toBe('ALTER TABLE "users" ADD COLUMN "age" INTEGER');
  });

  it("generates DROP COLUMN statements", async () => {
    const { adapter, calls } = mockAdapter("postgres");
    const schema = new Schema(adapter);

    schema.table("users", (table) => {
      table.dropColumn("legacy");
    });

    await schema.execute();

    expect(calls).toHaveLength(1);
    expect(calls[0].sql).toBe('ALTER TABLE "users" DROP COLUMN "legacy"');
  });

  it("generates RENAME COLUMN statements", async () => {
    const { adapter, calls } = mockAdapter("sqlite");
    const schema = new Schema(adapter);

    schema.table("users", (table) => {
      table.renameColumn("old_name", "new_name");
    });

    await schema.execute();

    expect(calls).toHaveLength(1);
    expect(calls[0].sql).toBe('ALTER TABLE "users" RENAME COLUMN "old_name" TO "new_name"');
  });

  it("creates unique index for composite unique on ALTER", async () => {
    const { adapter, calls } = mockAdapter("sqlite");
    const schema = new Schema(adapter);

    schema.table("oauth_accounts", (table) => {
      table.unique(["provider", "provider_user_id"]);
    });

    await schema.execute();

    expect(calls).toHaveLength(1);
    expect(calls[0].sql).toContain("CREATE UNIQUE INDEX");
    expect(calls[0].sql).toContain('"provider", "provider_user_id"');
  });
});

describe("Schema.drop / dropIfExists", () => {
  it("generates DROP TABLE", async () => {
    const { adapter, calls } = mockAdapter("sqlite");
    const schema = new Schema(adapter);

    schema.drop("users");
    await schema.execute();

    expect(calls).toHaveLength(1);
    expect(calls[0].sql).toBe('DROP TABLE "users"');
  });

  it("generates DROP TABLE IF EXISTS", async () => {
    const { adapter, calls } = mockAdapter("postgres");
    const schema = new Schema(adapter);

    schema.dropIfExists("users");
    await schema.execute();

    expect(calls).toHaveLength(1);
    expect(calls[0].sql).toBe('DROP TABLE IF EXISTS "users"');
  });
});

describe("Schema.rename", () => {
  it("generates ALTER TABLE RENAME TO", async () => {
    const { adapter, calls } = mockAdapter("sqlite");
    const schema = new Schema(adapter);

    schema.rename("old_table", "new_table");
    await schema.execute();

    expect(calls).toHaveLength(1);
    expect(calls[0].sql).toBe('ALTER TABLE "old_table" RENAME TO "new_table"');
  });
});

describe("Schema.raw", () => {
  it("executes raw SQL", async () => {
    const { adapter, calls } = mockAdapter("sqlite");
    const schema = new Schema(adapter);

    schema.raw("INSERT INTO users (name) VALUES (?)", ["Alice"]);
    await schema.execute();

    expect(calls).toHaveLength(1);
    expect(calls[0].sql).toBe("INSERT INTO users (name) VALUES (?)");
    expect(calls[0].params).toEqual(["Alice"]);
  });

  it("executes raw SQL without params", async () => {
    const { adapter, calls } = mockAdapter("sqlite");
    const schema = new Schema(adapter);

    schema.raw("SELECT 1");
    await schema.execute();

    expect(calls).toHaveLength(1);
    expect(calls[0].sql).toBe("SELECT 1");
  });
});

describe("Schema multiple operations", () => {
  it("executes multiple operations in order", async () => {
    const { adapter, calls } = mockAdapter("sqlite");
    const schema = new Schema(adapter);

    schema.create("users", (table) => {
      table.serial("id").primaryKey();
      table.text("name").notNull();
    });

    schema.create("posts", (table) => {
      table.serial("id").primaryKey();
      table.text("title").notNull();
      table.integer("user_id").notNull();
    });

    schema.raw("CREATE INDEX idx_posts_user ON posts(user_id)");

    await schema.execute();

    expect(calls).toHaveLength(3);
    expect(calls[0].sql).toContain('"users"');
    expect(calls[1].sql).toContain('"posts"');
    expect(calls[2].sql).toContain("CREATE INDEX");
  });
});

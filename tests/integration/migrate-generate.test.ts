import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SqliteAdapter } from "../../src/db/adapters/sqlite.js";
import { introspectTable, listTables } from "../../src/db/introspect.js";
import { resolveModelSchema, diffSchema } from "../../src/db/schema-diff.js";
import type { ModelInfo } from "../../src/db/schema-diff.js";
import type { ColumnInfo } from "../../src/db/introspect.js";
import { generateMigrationSQL } from "../../src/db/migration-generator.js";
import { Model } from "../../src/db/model.js";
import { Field } from "../../src/db/field.js";
import { unlinkSync } from "node:fs";

const DB_PATH = "./test-migrate-generate.db";
let adapter: SqliteAdapter;

describe("migrate generate integration", () => {
  beforeEach(async () => {
    adapter = new SqliteAdapter(DB_PATH);
    await adapter.connect();
  });

  afterEach(async () => {
    await adapter.close();
    try {
      unlinkSync(DB_PATH);
    } catch {}
  });

  it("generates CREATE TABLE for new models against empty DB", async () => {
    class User extends Model {
      static table = "users";
      static schema = {
        id: Field.serial().primaryKey(),
        name: Field.text().notNull(),
        email: Field.text().unique(),
      };
    }

    const modelInfos: ModelInfo[] = [{
      table: User.table,
      schema: resolveModelSchema(User),
    }];

    const tableNames = await listTables(adapter, "sqlite");
    const dbTables = new Map<string, ColumnInfo[]>();
    for (const name of tableNames) {
      const columns = await introspectTable(adapter, name, "sqlite");
      if (columns) dbTables.set(name, columns);
    }

    const operations = diffSchema(modelInfos, dbTables, "sqlite");
    expect(operations).toHaveLength(1);
    expect(operations[0].type).toBe("create_table");

    const { up } = generateMigrationSQL(operations, "sqlite");
    expect(up[0]).toContain("CREATE TABLE IF NOT EXISTS");

    // Execute the migration
    for (const sql of up) {
      if (!sql.startsWith("--")) {
        await adapter.raw(sql);
      }
    }

    // Verify table was created
    const cols = await introspectTable(adapter, "users", "sqlite");
    expect(cols).not.toBeNull();
    expect(cols!.map((c) => c.name)).toEqual(["id", "name", "email"]);
  });

  it("generates ADD COLUMN when model has new fields", async () => {
    await adapter.raw('CREATE TABLE "posts" ("id" INTEGER PRIMARY KEY, "title" TEXT NOT NULL)');

    class Post extends Model {
      static table = "posts";
      static schema = {
        id: Field.serial().primaryKey(),
        title: Field.text().notNull(),
        body: Field.text(),
        views: Field.integer().default(0),
      };
    }

    const modelInfos: ModelInfo[] = [{
      table: Post.table,
      schema: resolveModelSchema(Post),
    }];

    const tableNames = await listTables(adapter, "sqlite");
    const dbTables = new Map<string, ColumnInfo[]>();
    for (const name of tableNames) {
      const columns = await introspectTable(adapter, name, "sqlite");
      if (columns) dbTables.set(name, columns);
    }

    const operations = diffSchema(modelInfos, dbTables, "sqlite");
    expect(operations).toHaveLength(2);
    expect(operations.every((op) => op.type === "add_column")).toBe(true);

    const { up } = generateMigrationSQL(operations, "sqlite");

    // Execute the migration
    for (const sql of up) {
      if (!sql.startsWith("--")) {
        await adapter.raw(sql);
      }
    }

    // Verify columns were added
    const cols = await introspectTable(adapter, "posts", "sqlite");
    const colNames = cols!.map((c) => c.name);
    expect(colNames).toContain("body");
    expect(colNames).toContain("views");
  });

  it("detects no changes when schemas match", async () => {
    await adapter.raw('CREATE TABLE "items" ("id" INTEGER PRIMARY KEY, "name" TEXT NOT NULL)');

    class Item extends Model {
      static table = "items";
      static schema = {
        id: Field.serial().primaryKey(),
        name: Field.text().notNull(),
      };
    }

    const modelInfos: ModelInfo[] = [{
      table: Item.table,
      schema: resolveModelSchema(Item),
    }];

    const tableNames = await listTables(adapter, "sqlite");
    const dbTables = new Map<string, ColumnInfo[]>();
    for (const name of tableNames) {
      const columns = await introspectTable(adapter, name, "sqlite");
      if (columns) dbTables.set(name, columns);
    }

    const operations = diffSchema(modelInfos, dbTables, "sqlite");
    expect(operations).toHaveLength(0);
  });

  it("handles timestamps and softDelete in model resolution", async () => {
    class Event extends Model {
      static table = "events";
      static timestamps = true;
      static softDelete = true;
      static schema = {
        id: Field.serial().primaryKey(),
        title: Field.text().notNull(),
      };
    }

    const modelInfos: ModelInfo[] = [{
      table: Event.table,
      schema: resolveModelSchema(Event),
    }];

    const dbTables = new Map<string, ColumnInfo[]>();
    const operations = diffSchema(modelInfos, dbTables, "sqlite");

    expect(operations).toHaveLength(1);
    expect(operations[0].type).toBe("create_table");
    const createOp = operations[0] as Extract<typeof operations[0], { type: "create_table" }>;
    expect(Object.keys(createOp.columns)).toContain("created_at");
    expect(Object.keys(createOp.columns)).toContain("updated_at");
    expect(Object.keys(createOp.columns)).toContain("deleted_at");
  });

  it("excludes underscore-prefixed tables (_migrations)", async () => {
    await adapter.raw('CREATE TABLE "_migrations" ("id" INTEGER PRIMARY KEY, "name" TEXT NOT NULL, "applied_at" TEXT NOT NULL)');
    await adapter.raw('CREATE TABLE "users" ("id" INTEGER PRIMARY KEY)');

    const tables = await listTables(adapter, "sqlite");
    expect(tables).not.toContain("_migrations");
    expect(tables).toContain("users");
  });

  it("full pipeline: create, diff, migrate, verify", async () => {
    // Start with existing table
    await adapter.raw('CREATE TABLE "users" ("id" INTEGER PRIMARY KEY, "name" TEXT NOT NULL)');

    // Define model with changes
    class User extends Model {
      static table = "users";
      static schema = {
        id: Field.serial().primaryKey(),
        name: Field.text().notNull(),
        email: Field.text(),
      };
    }

    class Post extends Model {
      static table = "posts";
      static schema = {
        id: Field.serial().primaryKey(),
        title: Field.text().notNull(),
      };
    }

    // Build model infos
    const modelInfos: ModelInfo[] = [
      { table: User.table, schema: resolveModelSchema(User) },
      { table: Post.table, schema: resolveModelSchema(Post) },
    ];

    // Introspect
    const tableNames = await listTables(adapter, "sqlite");
    const dbTables = new Map<string, ColumnInfo[]>();
    for (const name of tableNames) {
      const columns = await introspectTable(adapter, name, "sqlite");
      if (columns) dbTables.set(name, columns);
    }

    // Diff
    const operations = diffSchema(modelInfos, dbTables, "sqlite");
    expect(operations.length).toBeGreaterThan(0);

    // Generate SQL
    const { up } = generateMigrationSQL(operations, "sqlite");

    // Execute migration
    for (const sql of up) {
      if (!sql.startsWith("--")) {
        await adapter.raw(sql);
      }
    }

    // Verify: users now has email column
    const userCols = await introspectTable(adapter, "users", "sqlite");
    expect(userCols!.map((c) => c.name)).toContain("email");

    // Verify: posts table was created
    const postCols = await introspectTable(adapter, "posts", "sqlite");
    expect(postCols).not.toBeNull();
    expect(postCols!.map((c) => c.name)).toEqual(["id", "title"]);
  });
});

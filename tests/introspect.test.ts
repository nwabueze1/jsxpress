import { describe, it, expect, vi } from "vitest";
import { introspectTable, listTables } from "../src/db/introspect.js";
import type { DatabaseAdapter } from "../src/db/adapter.js";

function mockAdapter(rawFn: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>): DatabaseAdapter {
  return {
    dialect: "sqlite",
    connect: vi.fn(),
    close: vi.fn(),
    find: vi.fn(),
    count: vi.fn(),
    insertOne: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    createCollection: vi.fn(),
    raw: rawFn as DatabaseAdapter["raw"],
  };
}

describe("introspectTable", () => {
  it("parses SQLite PRAGMA table_info", async () => {
    const adapter = mockAdapter(async () => ({
      rows: [
        { cid: 0, name: "id", type: "INTEGER", notnull: 1, dflt_value: null, pk: 1 },
        { cid: 1, name: "name", type: "TEXT", notnull: 1, dflt_value: null, pk: 0 },
        { cid: 2, name: "active", type: "INTEGER", notnull: 0, dflt_value: "1", pk: 0 },
      ],
    }));

    const cols = await introspectTable(adapter, "users", "sqlite");
    expect(cols).toEqual([
      { name: "id", type: "INTEGER", notNull: true, defaultValue: null, primaryKey: true },
      { name: "name", type: "TEXT", notNull: true, defaultValue: null, primaryKey: false },
      { name: "active", type: "INTEGER", notNull: false, defaultValue: "1", primaryKey: false },
    ]);
  });

  it("returns null for nonexistent SQLite table", async () => {
    const adapter = mockAdapter(async () => ({ rows: [] }));
    const result = await introspectTable(adapter, "nonexistent", "sqlite");
    expect(result).toBeNull();
  });

  it("parses Postgres information_schema columns", async () => {
    let callCount = 0;
    const adapter = mockAdapter(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          rows: [
            { column_name: "id", data_type: "integer", is_nullable: "NO", column_default: "nextval('users_id_seq')" },
            { column_name: "email", data_type: "text", is_nullable: "YES", column_default: null },
          ],
        };
      }
      // PK query
      return { rows: [{ attname: "id" }] };
    });

    const cols = await introspectTable(adapter, "users", "postgres");
    expect(cols).toEqual([
      { name: "id", type: "INTEGER", notNull: true, defaultValue: "nextval('users_id_seq')", primaryKey: true },
      { name: "email", type: "TEXT", notNull: false, defaultValue: null, primaryKey: false },
    ]);
  });

  it("parses MySQL information_schema columns", async () => {
    const adapter = mockAdapter(async () => ({
      rows: [
        { column_name: "id", column_type: "int", is_nullable: "NO", column_default: null, column_key: "PRI" },
        { column_name: "title", column_type: "text", is_nullable: "YES", column_default: null, column_key: "" },
      ],
    }));

    const cols = await introspectTable(adapter, "posts", "mysql");
    expect(cols).toEqual([
      { name: "id", type: "INT", notNull: true, defaultValue: null, primaryKey: true },
      { name: "title", type: "TEXT", notNull: false, defaultValue: null, primaryKey: false },
    ]);
  });

  it("sends correct SQL for each dialect", async () => {
    const calls: string[] = [];
    const adapter = mockAdapter(async (sql) => {
      calls.push(sql);
      return { rows: [] };
    });

    await introspectTable(adapter, "users", "sqlite");
    expect(calls[0]).toContain("PRAGMA table_info");

    calls.length = 0;
    await introspectTable(adapter, "users", "postgres");
    expect(calls[0]).toContain("information_schema.columns");

    calls.length = 0;
    await introspectTable(adapter, "users", "mysql");
    expect(calls[0]).toContain("information_schema.columns");
    expect(calls[0]).toContain("DATABASE()");
  });
});

describe("listTables", () => {
  it("lists SQLite tables excluding underscore-prefixed", async () => {
    const adapter = mockAdapter(async () => ({
      rows: [{ name: "users" }, { name: "posts" }],
    }));

    const tables = await listTables(adapter, "sqlite");
    expect(tables).toEqual(["users", "posts"]);
  });

  it("lists Postgres tables", async () => {
    const adapter = mockAdapter(async () => ({
      rows: [{ table_name: "users" }, { table_name: "orders" }],
    }));

    const tables = await listTables(adapter, "postgres");
    expect(tables).toEqual(["users", "orders"]);
  });

  it("lists MySQL tables", async () => {
    const adapter = mockAdapter(async () => ({
      rows: [{ table_name: "products" }],
    }));

    const tables = await listTables(adapter, "mysql");
    expect(tables).toEqual(["products"]);
  });

  it("sends correct SQL for sqlite", async () => {
    const calls: string[] = [];
    const adapter = mockAdapter(async (sql) => {
      calls.push(sql);
      return { rows: [] };
    });

    await listTables(adapter, "sqlite");
    expect(calls[0]).toContain("sqlite_master");
    expect(calls[0]).toContain("NOT LIKE");
  });
});

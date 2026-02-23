import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { jsx } from "../../src/jsx-runtime.js";
import { serve } from "../../src/index.js";
import { App } from "../../src/components/App.js";
import { Database } from "../../src/db/database.js";
import { MigrationRunner } from "../../src/db/migration.js";
import { SqliteAdapter } from "../../src/db/adapters/sqlite.js";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { ServerHandle } from "../../src/server/types.js";

const DB_PATH = "./test-migration.db";
let adapter: SqliteAdapter;
let tempDir: string;
let handle: ServerHandle | undefined;

async function writeMigration(
  dir: string,
  filename: string,
  upSql: string,
  downSql?: string,
): Promise<void> {
  const downFn = downSql
    ? `export async function down(schema) { schema.raw(${JSON.stringify(downSql)}); }`
    : "";
  const content = `
export async function up(schema) {
  schema.raw(${JSON.stringify(upSql)});
}
${downFn}
`;
  await writeFile(join(dir, filename), content);
}

describe("migration integration", () => {
  beforeEach(async () => {
    adapter = new SqliteAdapter(DB_PATH);
    await adapter.connect();
    tempDir = await mkdtemp(join(tmpdir(), "jsxpress-mig-int-"));
  });

  afterEach(async () => {
    if (handle) {
      await handle.close();
      handle = undefined;
    }
    await adapter.close();
    await rm(tempDir, { recursive: true, force: true });
    try {
      unlinkSync(DB_PATH);
    } catch {}
  });

  it("creates tables after up()", async () => {
    await writeMigration(
      tempDir,
      "001_create_users.js",
      "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)",
      "DROP TABLE IF EXISTS users",
    );

    const runner = new MigrationRunner(adapter, tempDir);
    await runner.up();

    const result = await adapter.raw(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='users'",
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].name).toBe("users");
  });

  it("drops tables after down()", async () => {
    await writeMigration(
      tempDir,
      "001_create_users.js",
      "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)",
      "DROP TABLE IF EXISTS users",
    );

    const runner = new MigrationRunner(adapter, tempDir);
    await runner.up();
    await runner.down();

    const result = await adapter.raw(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='users'",
    );
    expect(result.rows).toHaveLength(0);
  });

  it("tracks migrations in _migrations table", async () => {
    await writeMigration(
      tempDir,
      "001_create_users.js",
      "CREATE TABLE users (id INTEGER PRIMARY KEY)",
      "DROP TABLE IF EXISTS users",
    );
    await writeMigration(
      tempDir,
      "002_create_posts.js",
      "CREATE TABLE posts (id INTEGER PRIMARY KEY, user_id INTEGER)",
      "DROP TABLE IF EXISTS posts",
    );

    const runner = new MigrationRunner(adapter, tempDir);
    await runner.up();

    const result = await adapter.raw(
      'SELECT "id", "name" FROM "_migrations" ORDER BY "id"',
    );
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({ id: 1, name: "create_users" });
    expect(result.rows[1]).toMatchObject({ id: 2, name: "create_posts" });
  });

  it("is idempotent — up() twice only runs new migrations", async () => {
    await writeMigration(
      tempDir,
      "001_create_users.js",
      "CREATE TABLE users (id INTEGER PRIMARY KEY)",
      "DROP TABLE IF EXISTS users",
    );

    const runner = new MigrationRunner(adapter, tempDir);
    await runner.up();

    // Add a second migration
    await writeMigration(
      tempDir,
      "002_create_posts.js",
      "CREATE TABLE posts (id INTEGER PRIMARY KEY)",
      "DROP TABLE IF EXISTS posts",
    );

    // Running up again should only run the new migration, not fail on existing table
    await runner.up();

    const tables = await adapter.raw(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('users', 'posts') ORDER BY name",
    );
    expect(tables.rows).toHaveLength(2);

    const tracked = await adapter.raw(
      'SELECT "id" FROM "_migrations" ORDER BY "id"',
    );
    expect(tracked.rows).toHaveLength(2);
  });

  it("downAll removes all migrations in reverse", async () => {
    await writeMigration(
      tempDir,
      "001_create_users.js",
      "CREATE TABLE users (id INTEGER PRIMARY KEY)",
      "DROP TABLE IF EXISTS users",
    );
    await writeMigration(
      tempDir,
      "002_create_posts.js",
      "CREATE TABLE posts (id INTEGER PRIMARY KEY)",
      "DROP TABLE IF EXISTS posts",
    );

    const runner = new MigrationRunner(adapter, tempDir);
    await runner.up();
    await runner.downAll();

    const tables = await adapter.raw(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('users', 'posts')",
    );
    expect(tables.rows).toHaveLength(0);

    const tracked = await adapter.raw(
      'SELECT "id" FROM "_migrations"',
    );
    expect(tracked.rows).toHaveLength(0);
  });

  it("Database component with migrationsPath runs migrations on startup", async () => {
    await writeMigration(
      tempDir,
      "001_create_items.js",
      "CREATE TABLE items (id INTEGER PRIMARY KEY, title TEXT NOT NULL)",
      "DROP TABLE IF EXISTS items",
    );

    const tree = jsx(App, {
      port: 0,
      children: jsx(Database, {
        dialect: "sqlite" as const,
        url: DB_PATH,
        migrationsPath: tempDir,
      }),
    });

    handle = await serve(tree);

    // Verify the table was created by the migration
    const freshAdapter = new SqliteAdapter(DB_PATH);
    await freshAdapter.connect();
    try {
      const result = await freshAdapter.raw(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='items'",
      );
      expect(result.rows).toHaveLength(1);
    } finally {
      await freshAdapter.close();
    }
  });
});

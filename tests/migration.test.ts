import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MigrationRunner } from "../src/db/migration.js";
import type { DatabaseAdapter, QueryResult, WhereCondition, FindOptions } from "../src/db/adapter.js";
import type { FieldBuilder } from "../src/db/field.js";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

function mockAdapter(dialect: "sqlite" | "postgres" | "mysql" = "sqlite") {
  const calls: { sql: string; params: unknown[] }[] = [];
  const appliedIds = new Set<number>();

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

      // Track inserts/deletes to _migrations
      if (sql.includes("INSERT INTO") && sql.includes("_migrations")) {
        appliedIds.add(params[0] as number);
      }
      if (sql.includes("DELETE FROM") && sql.includes("_migrations")) {
        appliedIds.delete(params[0] as number);
      }

      // Return applied migration ids on SELECT
      if (sql.includes("SELECT") && sql.includes("_migrations")) {
        return {
          rows: [...appliedIds].map((id) => ({ id })),
        };
      }

      return { rows: [], changes: 0 };
    },
  };

  return { adapter, calls, appliedIds };
}

async function createTempMigrations(
  files: { name: string; up: string; down?: string }[],
): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "jsxpress-migrations-"));

  for (const file of files) {
    const downFn = file.down
      ? `export async function down(adapter) { ${file.down} }`
      : "";
    const content = `
export async function up(adapter) { ${file.up} }
${downFn}
`;
    await writeFile(join(dir, file.name), content);
  }

  return dir;
}

describe("MigrationRunner", () => {
  let tempDir: string | undefined;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  describe("ensureTable", () => {
    it("generates correct SQL for sqlite", async () => {
      const { adapter, calls } = mockAdapter("sqlite");
      tempDir = await createTempMigrations([]);
      const runner = new MigrationRunner(adapter, tempDir);
      await runner.ensureTable();

      expect(calls[0].sql).toBe(
        'CREATE TABLE IF NOT EXISTS "_migrations" ("id" INTEGER PRIMARY KEY, "name" TEXT NOT NULL, "applied_at" TEXT NOT NULL)',
      );
    });

    it("generates correct SQL for postgres", async () => {
      const { adapter, calls } = mockAdapter("postgres");
      tempDir = await createTempMigrations([]);
      const runner = new MigrationRunner(adapter, tempDir);
      await runner.ensureTable();

      expect(calls[0].sql).toBe(
        'CREATE TABLE IF NOT EXISTS "_migrations" ("id" INTEGER PRIMARY KEY, "name" TEXT NOT NULL, "applied_at" TEXT NOT NULL)',
      );
    });

    it("generates correct SQL for mysql", async () => {
      const { adapter, calls } = mockAdapter("mysql");
      tempDir = await createTempMigrations([]);
      const runner = new MigrationRunner(adapter, tempDir);
      await runner.ensureTable();

      expect(calls[0].sql).toBe(
        "CREATE TABLE IF NOT EXISTS `_migrations` (`id` INTEGER PRIMARY KEY, `name` TEXT NOT NULL, `applied_at` TEXT NOT NULL)",
      );
    });
  });

  describe("discover", () => {
    it("finds and sorts migration files by id", async () => {
      tempDir = await createTempMigrations([
        { name: "003_add_posts.js", up: "" },
        { name: "001_create_users.js", up: "" },
        { name: "002_add_email.js", up: "" },
      ]);

      const { adapter } = mockAdapter();
      const runner = new MigrationRunner(adapter, tempDir);
      const migrations = await runner.discover();

      expect(migrations).toHaveLength(3);
      expect(migrations[0].id).toBe(1);
      expect(migrations[0].name).toBe("create_users");
      expect(migrations[1].id).toBe(2);
      expect(migrations[1].name).toBe("add_email");
      expect(migrations[2].id).toBe(3);
      expect(migrations[2].name).toBe("add_posts");
    });

    it("supports hyphen separator", async () => {
      tempDir = await createTempMigrations([
        { name: "001-create-users.js", up: "" },
      ]);

      const { adapter } = mockAdapter();
      const runner = new MigrationRunner(adapter, tempDir);
      const migrations = await runner.discover();

      expect(migrations).toHaveLength(1);
      expect(migrations[0].name).toBe("create-users");
    });

    it("ignores non-migration files", async () => {
      tempDir = await createTempMigrations([
        { name: "001_create_users.js", up: "" },
      ]);
      // Write a non-matching file
      await writeFile(join(tempDir, "README.md"), "# Migrations");
      await writeFile(join(tempDir, "helpers.js"), "export const x = 1;");

      const { adapter } = mockAdapter();
      const runner = new MigrationRunner(adapter, tempDir);
      const migrations = await runner.discover();

      expect(migrations).toHaveLength(1);
    });

    it("supports .ts, .js, and .mjs extensions", async () => {
      tempDir = await createTempMigrations([
        { name: "001_first.js", up: "" },
      ]);
      await writeFile(join(tempDir, "002_second.mjs"), "export async function up() {}");
      // .ts files won't be dynamically imported directly, but discover should find them
      await writeFile(join(tempDir, "003_third.ts"), "export async function up() {}");

      const { adapter } = mockAdapter();
      const runner = new MigrationRunner(adapter, tempDir);
      const migrations = await runner.discover();

      expect(migrations).toHaveLength(3);
      expect(migrations.map((m) => m.filename)).toEqual([
        "001_first.js",
        "002_second.mjs",
        "003_third.ts",
      ]);
    });
  });

  describe("pending", () => {
    it("returns only unapplied migrations", async () => {
      tempDir = await createTempMigrations([
        { name: "001_first.js", up: "" },
        { name: "002_second.js", up: "" },
        { name: "003_third.js", up: "" },
      ]);

      const { adapter, appliedIds } = mockAdapter();
      appliedIds.add(1);
      appliedIds.add(2);

      const runner = new MigrationRunner(adapter, tempDir);
      const pending = await runner.pending();

      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe(3);
    });

    it("returns all when none applied", async () => {
      tempDir = await createTempMigrations([
        { name: "001_first.js", up: "" },
        { name: "002_second.js", up: "" },
      ]);

      const { adapter } = mockAdapter();
      const runner = new MigrationRunner(adapter, tempDir);
      const pending = await runner.pending();

      expect(pending).toHaveLength(2);
    });
  });

  describe("up", () => {
    it("runs pending migrations and inserts tracking records", async () => {
      tempDir = await createTempMigrations([
        {
          name: "001_first.js",
          up: `await adapter.raw("CREATE TABLE t1 (id INT)");`,
        },
        {
          name: "002_second.js",
          up: `await adapter.raw("CREATE TABLE t2 (id INT)");`,
        },
      ]);

      const { adapter, calls } = mockAdapter();
      const runner = new MigrationRunner(adapter, tempDir);
      await runner.up();

      // Should have: ensureTable + select applied + CREATE t1 + INSERT tracking + CREATE t2 + INSERT tracking
      const createCalls = calls.filter((c) => c.sql.startsWith("CREATE TABLE t"));
      expect(createCalls).toHaveLength(2);
      expect(createCalls[0].sql).toBe("CREATE TABLE t1 (id INT)");
      expect(createCalls[1].sql).toBe("CREATE TABLE t2 (id INT)");

      const insertCalls = calls.filter(
        (c) => c.sql.includes("INSERT INTO") && c.sql.includes("_migrations"),
      );
      expect(insertCalls).toHaveLength(2);
      expect(insertCalls[0].params[0]).toBe(1);
      expect(insertCalls[0].params[1]).toBe("first");
      expect(insertCalls[1].params[0]).toBe(2);
      expect(insertCalls[1].params[1]).toBe("second");
    });

    it("skips already applied migrations", async () => {
      tempDir = await createTempMigrations([
        {
          name: "001_first.js",
          up: `await adapter.raw("CREATE TABLE t1 (id INT)");`,
        },
        {
          name: "002_second.js",
          up: `await adapter.raw("CREATE TABLE t2 (id INT)");`,
        },
      ]);

      const { adapter, calls, appliedIds } = mockAdapter();
      appliedIds.add(1); // first already applied

      const runner = new MigrationRunner(adapter, tempDir);
      await runner.up();

      const createCalls = calls.filter((c) => c.sql.startsWith("CREATE TABLE t"));
      expect(createCalls).toHaveLength(1);
      expect(createCalls[0].sql).toBe("CREATE TABLE t2 (id INT)");
    });
  });

  describe("down", () => {
    it("rolls back the latest applied migration", async () => {
      tempDir = await createTempMigrations([
        {
          name: "001_first.js",
          up: `await adapter.raw("CREATE TABLE t1 (id INT)");`,
          down: `await adapter.raw("DROP TABLE t1");`,
        },
        {
          name: "002_second.js",
          up: `await adapter.raw("CREATE TABLE t2 (id INT)");`,
          down: `await adapter.raw("DROP TABLE t2");`,
        },
      ]);

      const { adapter, calls, appliedIds } = mockAdapter();
      appliedIds.add(1);
      appliedIds.add(2);

      const runner = new MigrationRunner(adapter, tempDir);
      await runner.down();

      const dropCalls = calls.filter((c) => c.sql.startsWith("DROP TABLE"));
      expect(dropCalls).toHaveLength(1);
      expect(dropCalls[0].sql).toBe("DROP TABLE t2");

      const deleteCalls = calls.filter(
        (c) => c.sql.includes("DELETE FROM") && c.sql.includes("_migrations"),
      );
      expect(deleteCalls).toHaveLength(1);
      expect(deleteCalls[0].params[0]).toBe(2);
    });

    it("throws when migration has no down export", async () => {
      tempDir = await createTempMigrations([
        {
          name: "001_first.js",
          up: `await adapter.raw("CREATE TABLE t1 (id INT)");`,
          // no down
        },
      ]);

      const { adapter, appliedIds } = mockAdapter();
      appliedIds.add(1);

      const runner = new MigrationRunner(adapter, tempDir);
      await expect(runner.down()).rejects.toThrow(
        "does not export a down() function",
      );
    });

    it("does nothing when no migrations applied", async () => {
      tempDir = await createTempMigrations([
        {
          name: "001_first.js",
          up: "",
          down: "",
        },
      ]);

      const { adapter, calls } = mockAdapter();
      const runner = new MigrationRunner(adapter, tempDir);
      await runner.down();

      const dropCalls = calls.filter((c) => c.sql.startsWith("DROP"));
      expect(dropCalls).toHaveLength(0);
    });
  });

  describe("downAll", () => {
    it("rolls back all migrations in reverse order", async () => {
      tempDir = await createTempMigrations([
        {
          name: "001_first.js",
          up: `await adapter.raw("CREATE TABLE t1 (id INT)");`,
          down: `await adapter.raw("DROP TABLE t1");`,
        },
        {
          name: "002_second.js",
          up: `await adapter.raw("CREATE TABLE t2 (id INT)");`,
          down: `await adapter.raw("DROP TABLE t2");`,
        },
        {
          name: "003_third.js",
          up: `await adapter.raw("CREATE TABLE t3 (id INT)");`,
          down: `await adapter.raw("DROP TABLE t3");`,
        },
      ]);

      const { adapter, calls, appliedIds } = mockAdapter();
      appliedIds.add(1);
      appliedIds.add(2);
      appliedIds.add(3);

      const runner = new MigrationRunner(adapter, tempDir);
      await runner.downAll();

      const dropCalls = calls.filter((c) => c.sql.startsWith("DROP TABLE"));
      expect(dropCalls).toHaveLength(3);
      expect(dropCalls[0].sql).toBe("DROP TABLE t3");
      expect(dropCalls[1].sql).toBe("DROP TABLE t2");
      expect(dropCalls[2].sql).toBe("DROP TABLE t1");
    });
  });

  describe("downTo", () => {
    it("rolls back to specified migration id", async () => {
      tempDir = await createTempMigrations([
        {
          name: "001_first.js",
          up: `await adapter.raw("CREATE TABLE t1 (id INT)");`,
          down: `await adapter.raw("DROP TABLE t1");`,
        },
        {
          name: "002_second.js",
          up: `await adapter.raw("CREATE TABLE t2 (id INT)");`,
          down: `await adapter.raw("DROP TABLE t2");`,
        },
        {
          name: "003_third.js",
          up: `await adapter.raw("CREATE TABLE t3 (id INT)");`,
          down: `await adapter.raw("DROP TABLE t3");`,
        },
      ]);

      const { adapter, calls, appliedIds } = mockAdapter();
      appliedIds.add(1);
      appliedIds.add(2);
      appliedIds.add(3);

      const runner = new MigrationRunner(adapter, tempDir);
      await runner.downTo(1);

      const dropCalls = calls.filter((c) => c.sql.startsWith("DROP TABLE"));
      expect(dropCalls).toHaveLength(2);
      expect(dropCalls[0].sql).toBe("DROP TABLE t3");
      expect(dropCalls[1].sql).toBe("DROP TABLE t2");
    });
  });
});

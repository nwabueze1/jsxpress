import { describe, it, expect } from "vitest";
import { generateMigrationSQL, generateMigrationFile } from "../src/db/migration-generator.js";
import type { DiffOperation } from "../src/db/schema-diff.js";
import { Field } from "../src/db/field.js";

describe("generateMigrationSQL", () => {
  describe("create_table", () => {
    const ops: DiffOperation[] = [
      {
        type: "create_table",
        table: "users",
        columns: {
          id: Field.serial().primaryKey().toDefinition(),
          name: Field.text().notNull().toDefinition(),
        },
      },
    ];

    it("generates CREATE TABLE for sqlite", () => {
      const { up, down } = generateMigrationSQL(ops, "sqlite");
      expect(up[0]).toContain("CREATE TABLE IF NOT EXISTS");
      expect(up[0]).toContain('"users"');
      expect(down[0]).toBe('DROP TABLE IF EXISTS "users"');
    });

    it("generates CREATE TABLE for postgres", () => {
      const { up } = generateMigrationSQL(ops, "postgres");
      expect(up[0]).toContain("SERIAL PRIMARY KEY");
    });

    it("generates CREATE TABLE for mysql", () => {
      const { up, down } = generateMigrationSQL(ops, "mysql");
      expect(up[0]).toContain("`users`");
      expect(down[0]).toContain("`users`");
    });
  });

  describe("add_column", () => {
    const ops: DiffOperation[] = [
      {
        type: "add_column",
        table: "users",
        column: "email",
        definition: Field.text().unique().toDefinition(),
      },
    ];

    it("generates ALTER TABLE ADD COLUMN for sqlite", () => {
      const { up, down } = generateMigrationSQL(ops, "sqlite");
      expect(up[0]).toBe('ALTER TABLE "users" ADD COLUMN "email" TEXT UNIQUE');
      expect(down[0]).toBe('ALTER TABLE "users" DROP COLUMN "email"');
    });

    it("generates ALTER TABLE ADD COLUMN for postgres", () => {
      const { up } = generateMigrationSQL(ops, "postgres");
      expect(up[0]).toBe('ALTER TABLE "users" ADD COLUMN "email" TEXT UNIQUE');
    });
  });

  describe("drop_column", () => {
    const ops: DiffOperation[] = [
      { type: "drop_column", table: "users", column: "legacy_col" },
    ];

    it("generates DROP COLUMN with sqlite warning", () => {
      const { up, down } = generateMigrationSQL(ops, "sqlite");
      expect(up[0]).toContain("WARNING");
      expect(up[1]).toBe('ALTER TABLE "users" DROP COLUMN "legacy_col"');
      expect(down[0]).toContain("TODO");
    });

    it("generates DROP COLUMN without warning for postgres", () => {
      const { up } = generateMigrationSQL(ops, "postgres");
      expect(up).toHaveLength(1);
      expect(up[0]).toBe('ALTER TABLE "users" DROP COLUMN "legacy_col"');
    });
  });

  describe("alter_column", () => {
    const ops: DiffOperation[] = [
      {
        type: "alter_column",
        table: "users",
        column: "score",
        from: { name: "score", type: "INTEGER", notNull: false, defaultValue: null, primaryKey: false },
        to: Field.real().toDefinition(),
      },
    ];

    it("emits warning comment for sqlite", () => {
      const { up } = generateMigrationSQL(ops, "sqlite");
      expect(up[0]).toContain("WARNING");
      expect(up[0]).toContain("SQLite does not support ALTER COLUMN");
    });

    it("generates ALTER COLUMN TYPE for postgres", () => {
      const { up, down } = generateMigrationSQL(ops, "postgres");
      expect(up[0]).toBe('ALTER TABLE "users" ALTER COLUMN "score" TYPE DOUBLE PRECISION');
      expect(down[0]).toBe('ALTER TABLE "users" ALTER COLUMN "score" TYPE INTEGER');
    });

    it("generates MODIFY COLUMN for mysql", () => {
      const { up, down } = generateMigrationSQL(ops, "mysql");
      expect(up[0]).toContain("MODIFY COLUMN");
      expect(up[0]).toContain("DOUBLE");
      expect(down[0]).toContain("MODIFY COLUMN");
    });
  });

  describe("drop_table", () => {
    const ops: DiffOperation[] = [
      { type: "drop_table", table: "old_stuff" },
    ];

    it("generates DROP TABLE", () => {
      const { up, down } = generateMigrationSQL(ops, "sqlite");
      expect(up[0]).toBe('DROP TABLE IF EXISTS "old_stuff"');
      expect(down[0]).toContain("TODO");
    });
  });
});

describe("generateMigrationFile", () => {
  it("produces valid TypeScript with import", () => {
    const file = generateMigrationFile(
      ['CREATE TABLE IF NOT EXISTS "users" ("id" INTEGER PRIMARY KEY)'],
      ['DROP TABLE IF EXISTS "users"'],
    );
    expect(file).toContain('import type { Schema } from "jsxserve"');
    expect(file).toContain("export async function up");
    expect(file).toContain("export async function down");
  });

  it("uses backtick template literals for SQL statements", () => {
    const file = generateMigrationFile(
      ['CREATE TABLE IF NOT EXISTS "users" ("id" INTEGER PRIMARY KEY)'],
      ['DROP TABLE IF EXISTS "users"'],
    );
    expect(file).toContain("schema.raw(`");
    expect(file).not.toContain('schema.raw("');
  });

  it("preserves comment lines without wrapping in schema.raw", () => {
    const file = generateMigrationFile(
      ["-- WARNING: this is a comment", 'ALTER TABLE "t" DROP COLUMN "c"'],
      ["-- TODO: reverse"],
    );
    expect(file).toContain("  -- WARNING: this is a comment");
    expect(file).toContain("  -- TODO: reverse");
  });

  it("escapes backticks in SQL", () => {
    const file = generateMigrationFile(
      ["ALTER TABLE `users` ADD COLUMN `email` TEXT"],
      ["ALTER TABLE `users` DROP COLUMN `email`"],
    );
    expect(file).toContain("\\`users\\`");
  });

  it("escapes dollar signs in SQL", () => {
    const file = generateMigrationFile(
      ["SELECT $1"],
      [],
    );
    expect(file).toContain("\\$1");
  });
});

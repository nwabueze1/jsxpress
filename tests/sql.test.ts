import { describe, it, expect } from "vitest";
import { Field } from "../src/db/field.js";
import { buildCreateTable, fieldTypeToSql, placeholder, quoteIdent } from "../src/db/sql.js";

describe("fieldTypeToSql", () => {
  it("maps types for sqlite", () => {
    expect(fieldTypeToSql("serial", "sqlite")).toBe("INTEGER");
    expect(fieldTypeToSql("text", "sqlite")).toBe("TEXT");
    expect(fieldTypeToSql("integer", "sqlite")).toBe("INTEGER");
    expect(fieldTypeToSql("boolean", "sqlite")).toBe("INTEGER");
    expect(fieldTypeToSql("json", "sqlite")).toBe("TEXT");
    expect(fieldTypeToSql("real", "sqlite")).toBe("REAL");
  });

  it("maps types for postgres", () => {
    expect(fieldTypeToSql("serial", "postgres")).toBe("SERIAL");
    expect(fieldTypeToSql("text", "postgres")).toBe("TEXT");
    expect(fieldTypeToSql("boolean", "postgres")).toBe("BOOLEAN");
    expect(fieldTypeToSql("json", "postgres")).toBe("JSONB");
    expect(fieldTypeToSql("timestamp", "postgres")).toBe("TIMESTAMPTZ");
  });

  it("maps types for mysql", () => {
    expect(fieldTypeToSql("serial", "mysql")).toBe("INT AUTO_INCREMENT");
    expect(fieldTypeToSql("boolean", "mysql")).toBe("TINYINT(1)");
    expect(fieldTypeToSql("json", "mysql")).toBe("JSON");
  });
});

describe("quoteIdent", () => {
  it("uses double quotes for sqlite", () => {
    expect(quoteIdent("users", "sqlite")).toBe('"users"');
  });

  it("uses double quotes for postgres", () => {
    expect(quoteIdent("users", "postgres")).toBe('"users"');
  });

  it("uses backticks for mysql", () => {
    expect(quoteIdent("users", "mysql")).toBe("`users`");
  });
});

describe("placeholder", () => {
  it("uses ? for sqlite", () => {
    expect(placeholder(1, "sqlite")).toBe("?");
    expect(placeholder(2, "sqlite")).toBe("?");
  });

  it("uses $N for postgres", () => {
    expect(placeholder(1, "postgres")).toBe("$1");
    expect(placeholder(3, "postgres")).toBe("$3");
  });

  it("uses ? for mysql", () => {
    expect(placeholder(1, "mysql")).toBe("?");
  });
});

describe("buildCreateTable", () => {
  const schema = {
    id: Field.serial().primaryKey(),
    name: Field.text().notNull(),
    email: Field.text().unique(),
    active: Field.boolean().default(true),
  };

  it("generates SQLite CREATE TABLE", () => {
    const sql = buildCreateTable("users", schema, "sqlite");
    expect(sql).toBe(
      'CREATE TABLE IF NOT EXISTS "users" ("id" INTEGER PRIMARY KEY, "name" TEXT NOT NULL, "email" TEXT UNIQUE, "active" INTEGER DEFAULT true)'
    );
  });

  it("generates Postgres CREATE TABLE", () => {
    const sql = buildCreateTable("users", schema, "postgres");
    expect(sql).toBe(
      'CREATE TABLE IF NOT EXISTS "users" ("id" SERIAL PRIMARY KEY, "name" TEXT NOT NULL, "email" TEXT UNIQUE, "active" BOOLEAN DEFAULT true)'
    );
  });

  it("generates MySQL CREATE TABLE", () => {
    const sql = buildCreateTable("users", schema, "mysql");
    expect(sql).toBe(
      "CREATE TABLE IF NOT EXISTS `users` (`id` INT AUTO_INCREMENT PRIMARY KEY, `name` TEXT NOT NULL, `email` TEXT UNIQUE, `active` TINYINT(1) DEFAULT true)"
    );
  });
});

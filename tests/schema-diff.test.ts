import { describe, it, expect } from "vitest";
import { diffSchema, resolveModelSchema, typesMatch } from "../src/db/schema-diff.js";
import type { ModelInfo, DiffOperation } from "../src/db/schema-diff.js";
import type { ColumnInfo } from "../src/db/introspect.js";
import { Field } from "../src/db/field.js";
import { Model } from "../src/db/model.js";

describe("typesMatch", () => {
  it("matches exact SQL types", () => {
    expect(typesMatch("text", "TEXT", "sqlite")).toBe(true);
    expect(typesMatch("integer", "INTEGER", "sqlite")).toBe(true);
  });

  it("matches serial to INTEGER for sqlite", () => {
    expect(typesMatch("serial", "INTEGER", "sqlite")).toBe(true);
  });

  it("matches serial to INTEGER for postgres", () => {
    expect(typesMatch("serial", "INTEGER", "postgres")).toBe(true);
  });

  it("matches serial to INT for mysql", () => {
    expect(typesMatch("serial", "INT", "mysql")).toBe(true);
  });

  it("normalizes by stripping parenthetical precision", () => {
    expect(typesMatch("boolean", "TINYINT(1)", "mysql")).toBe(true);
  });

  it("rejects mismatched types", () => {
    expect(typesMatch("text", "INTEGER", "sqlite")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(typesMatch("text", "text", "sqlite")).toBe(true);
    expect(typesMatch("integer", "integer", "postgres")).toBe(true);
  });

  it("matches INT and INTEGER in mysql", () => {
    expect(typesMatch("integer", "INTEGER", "mysql")).toBe(true);
    expect(typesMatch("integer", "INT", "mysql")).toBe(true);
  });
});

describe("resolveModelSchema", () => {
  it("converts FieldBuilder schema to FieldDefinition", () => {
    class User extends Model {
      static table = "users";
      static schema = {
        id: Field.serial().primaryKey(),
        name: Field.text().notNull(),
      };
    }

    const resolved = resolveModelSchema(User);
    expect(resolved.id.type).toBe("serial");
    expect(resolved.id.primaryKey).toBe(true);
    expect(resolved.name.type).toBe("text");
    expect(resolved.name.notNull).toBe(true);
  });

  it("merges timestamp columns when timestamps=true", () => {
    class Post extends Model {
      static table = "posts";
      static timestamps = true;
      static schema = {
        id: Field.serial().primaryKey(),
      };
    }

    const resolved = resolveModelSchema(Post);
    expect(resolved.created_at).toBeDefined();
    expect(resolved.created_at.type).toBe("timestamp");
    expect(resolved.created_at.notNull).toBe(true);
    expect(resolved.updated_at).toBeDefined();
    expect(resolved.updated_at.type).toBe("timestamp");
    expect(resolved.updated_at.notNull).toBe(true);
  });

  it("merges deleted_at when softDelete=true", () => {
    class Post extends Model {
      static table = "posts";
      static softDelete = true;
      static schema = {
        id: Field.serial().primaryKey(),
      };
    }

    const resolved = resolveModelSchema(Post);
    expect(resolved.deleted_at).toBeDefined();
    expect(resolved.deleted_at.type).toBe("timestamp");
    expect(resolved.deleted_at.notNull).toBe(false);
  });

  it("does not add timestamps when timestamps=false", () => {
    class Item extends Model {
      static table = "items";
      static schema = {
        id: Field.serial().primaryKey(),
      };
    }

    const resolved = resolveModelSchema(Item);
    expect(resolved.created_at).toBeUndefined();
    expect(resolved.updated_at).toBeUndefined();
  });
});

describe("diffSchema", () => {
  function col(name: string, type: string, pk = false, notNull = false): ColumnInfo {
    return { name, type, primaryKey: pk, notNull, defaultValue: null };
  }

  it("detects new table (create_table)", () => {
    const models: ModelInfo[] = [
      { table: "users", schema: { id: Field.serial().primaryKey().toDefinition(), name: Field.text().notNull().toDefinition() } },
    ];
    const dbTables = new Map<string, ColumnInfo[]>();

    const ops = diffSchema(models, dbTables, "sqlite");
    expect(ops).toHaveLength(1);
    expect(ops[0].type).toBe("create_table");
    expect((ops[0] as Extract<DiffOperation, { type: "create_table" }>).table).toBe("users");
  });

  it("detects new column (add_column)", () => {
    const models: ModelInfo[] = [
      { table: "users", schema: { id: Field.serial().primaryKey().toDefinition(), email: Field.text().toDefinition() } },
    ];
    const dbTables = new Map([
      ["users", [col("id", "INTEGER", true)]],
    ]);

    const ops = diffSchema(models, dbTables, "sqlite");
    expect(ops).toHaveLength(1);
    expect(ops[0].type).toBe("add_column");
    expect((ops[0] as Extract<DiffOperation, { type: "add_column" }>).column).toBe("email");
  });

  it("detects dropped column (drop_column)", () => {
    const models: ModelInfo[] = [
      { table: "users", schema: { id: Field.serial().primaryKey().toDefinition() } },
    ];
    const dbTables = new Map([
      ["users", [col("id", "INTEGER", true), col("old_col", "TEXT")]],
    ]);

    const ops = diffSchema(models, dbTables, "sqlite");
    expect(ops).toHaveLength(1);
    expect(ops[0].type).toBe("drop_column");
    expect((ops[0] as Extract<DiffOperation, { type: "drop_column" }>).column).toBe("old_col");
  });

  it("detects type change (alter_column)", () => {
    const models: ModelInfo[] = [
      { table: "users", schema: { id: Field.serial().primaryKey().toDefinition(), score: Field.real().toDefinition() } },
    ];
    const dbTables = new Map([
      ["users", [col("id", "INTEGER", true), col("score", "INTEGER")]],
    ]);

    const ops = diffSchema(models, dbTables, "sqlite");
    expect(ops).toHaveLength(1);
    expect(ops[0].type).toBe("alter_column");
  });

  it("detects dropped table (drop_table)", () => {
    const models: ModelInfo[] = [];
    const dbTables = new Map([
      ["old_table", [col("id", "INTEGER", true)]],
    ]);

    const ops = diffSchema(models, dbTables, "sqlite");
    expect(ops).toHaveLength(1);
    expect(ops[0].type).toBe("drop_table");
    expect((ops[0] as Extract<DiffOperation, { type: "drop_table" }>).table).toBe("old_table");
  });

  it("returns empty array when schemas match", () => {
    const models: ModelInfo[] = [
      { table: "users", schema: { id: Field.serial().primaryKey().toDefinition(), name: Field.text().toDefinition() } },
    ];
    const dbTables = new Map([
      ["users", [col("id", "INTEGER", true), col("name", "TEXT")]],
    ]);

    const ops = diffSchema(models, dbTables, "sqlite");
    expect(ops).toHaveLength(0);
  });

  it("handles multiple operations at once", () => {
    const models: ModelInfo[] = [
      { table: "users", schema: { id: Field.serial().primaryKey().toDefinition(), email: Field.text().toDefinition() } },
      { table: "posts", schema: { id: Field.serial().primaryKey().toDefinition() } },
    ];
    const dbTables = new Map([
      ["users", [col("id", "INTEGER", true), col("name", "TEXT")]],
      ["legacy", [col("id", "INTEGER", true)]],
    ]);

    const ops = diffSchema(models, dbTables, "sqlite");
    const types = ops.map((o) => o.type);
    expect(types).toContain("add_column");     // email added to users
    expect(types).toContain("drop_column");    // name dropped from users
    expect(types).toContain("create_table");   // posts created
    expect(types).toContain("drop_table");     // legacy dropped
  });

  it("does not flag serial as different from INTEGER", () => {
    const models: ModelInfo[] = [
      { table: "users", schema: { id: Field.serial().primaryKey().toDefinition() } },
    ];
    const dbTables = new Map([
      ["users", [col("id", "INTEGER", true)]],
    ]);

    const ops = diffSchema(models, dbTables, "sqlite");
    expect(ops).toHaveLength(0);
  });
});

import type { Dialect } from "./adapter.js";
import type { FieldDefinition, FieldType } from "./field.js";
import { FieldBuilder } from "./field.js";

export type SqlDialect = Exclude<Dialect, "mongodb">;

const TYPE_MAP: Record<SqlDialect, Record<FieldType, string>> = {
  sqlite: {
    serial: "INTEGER",
    text: "TEXT",
    integer: "INTEGER",
    boolean: "INTEGER",
    timestamp: "TEXT",
    json: "TEXT",
    real: "REAL",
  },
  postgres: {
    serial: "SERIAL",
    text: "TEXT",
    integer: "INTEGER",
    boolean: "BOOLEAN",
    timestamp: "TIMESTAMPTZ",
    json: "JSONB",
    real: "DOUBLE PRECISION",
  },
  mysql: {
    serial: "INT AUTO_INCREMENT",
    text: "TEXT",
    integer: "INT",
    boolean: "TINYINT(1)",
    timestamp: "DATETIME",
    json: "JSON",
    real: "DOUBLE",
  },
};

export function fieldTypeToSql(type: FieldType, dialect: SqlDialect): string {
  return TYPE_MAP[dialect][type];
}

export function quoteIdent(name: string, dialect: Dialect): string {
  if (dialect === "mysql") return `\`${name}\``;
  return `"${name}"`;
}

export function placeholder(index: number, dialect: Dialect): string {
  if (dialect === "postgres") return `$${index}`;
  return "?";
}

export function buildCreateTable(
  tableName: string,
  schema: Record<string, FieldBuilder>,
  dialect: SqlDialect
): string {
  const cols: string[] = [];

  for (const [name, builder] of Object.entries(schema)) {
    const def: FieldDefinition = builder.toDefinition();
    const parts: string[] = [quoteIdent(name, dialect), fieldTypeToSql(def.type, dialect)];

    if (def.primaryKey) {
      if (dialect === "sqlite" && def.type === "serial") {
        // SQLite: INTEGER PRIMARY KEY is auto-incrementing
        parts[1] = "INTEGER";
      }
      parts.push("PRIMARY KEY");
    }

    if (def.notNull && !def.primaryKey) {
      parts.push("NOT NULL");
    }

    if (def.unique) {
      parts.push("UNIQUE");
    }

    if (def.defaultValue !== undefined) {
      const val = typeof def.defaultValue === "string"
        ? `'${def.defaultValue}'`
        : String(def.defaultValue);
      parts.push(`DEFAULT ${val}`);
    }

    cols.push(parts.join(" "));
  }

  const quotedTable = quoteIdent(tableName, dialect);
  return `CREATE TABLE IF NOT EXISTS ${quotedTable} (${cols.join(", ")})`;
}

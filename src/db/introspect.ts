import type { DatabaseAdapter } from "./adapter.js";
import type { SqlDialect } from "./sql.js";

export interface ColumnInfo {
  name: string;
  type: string;
  notNull: boolean;
  defaultValue: string | null;
  primaryKey: boolean;
}

export async function introspectTable(
  adapter: DatabaseAdapter,
  tableName: string,
  dialect: SqlDialect,
): Promise<ColumnInfo[] | null> {
  switch (dialect) {
    case "sqlite": {
      const result = await adapter.raw(`PRAGMA table_info("${tableName}")`);
      if (result.rows.length === 0) return null;
      return result.rows.map((row) => ({
        name: row.name as string,
        type: (row.type as string).toUpperCase(),
        notNull: (row.notnull as number) === 1,
        defaultValue: row.dflt_value as string | null,
        primaryKey: (row.pk as number) === 1,
      }));
    }

    case "postgres": {
      const colResult = await adapter.raw(
        `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = $1`,
        [tableName],
      );
      if (colResult.rows.length === 0) return null;

      const pkResult = await adapter.raw(
        `SELECT a.attname FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey) WHERE i.indrelid = $1::regclass AND i.indisprimary`,
        [tableName],
      );
      const pkColumns = new Set(pkResult.rows.map((r) => r.attname as string));

      return colResult.rows.map((row) => ({
        name: row.column_name as string,
        type: (row.data_type as string).toUpperCase(),
        notNull: (row.is_nullable as string) === "NO",
        defaultValue: row.column_default as string | null,
        primaryKey: pkColumns.has(row.column_name as string),
      }));
    }

    case "mysql": {
      const result = await adapter.raw(
        `SELECT column_name, column_type, is_nullable, column_default, column_key FROM information_schema.columns WHERE table_name = ? AND table_schema = DATABASE()`,
        [tableName],
      );
      if (result.rows.length === 0) return null;
      return result.rows.map((row) => ({
        name: row.column_name as string,
        type: (row.column_type as string).toUpperCase(),
        notNull: (row.is_nullable as string) === "NO",
        defaultValue: row.column_default as string | null,
        primaryKey: (row.column_key as string) === "PRI",
      }));
    }
  }
}

export async function listTables(
  adapter: DatabaseAdapter,
  dialect: SqlDialect,
): Promise<string[]> {
  switch (dialect) {
    case "sqlite": {
      const result = await adapter.raw(
        `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '\\_%' ESCAPE '\\'`,
      );
      return result.rows.map((r) => r.name as string);
    }

    case "postgres": {
      const result = await adapter.raw(
        `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name NOT LIKE '\\_%'`,
      );
      return result.rows.map((r) => r.table_name as string);
    }

    case "mysql": {
      const result = await adapter.raw(
        `SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name NOT LIKE '\\_%'`,
      );
      return result.rows.map((r) => r.table_name as string);
    }
  }
}

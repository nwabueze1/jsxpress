import type { QueryResult } from "../adapter.js";
import type { SqlDialect } from "../sql.js";
import { SqlAdapter } from "./sql-adapter.js";

export class SqliteAdapter extends SqlAdapter {
  readonly dialect: SqlDialect = "sqlite";
  private db: any = null;
  private url: string;

  constructor(url: string) {
    super();
    this.url = url;
  }

  async connect(): Promise<void> {
    const mod = await import(/* @vite-ignore */ "better-sqlite3");
    const Database = mod.default ?? mod;
    this.db = new Database(this.url);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
  }

  protected async execute(sql: string, params: unknown[] = []): Promise<QueryResult> {
    const stmt = this.db.prepare(sql);
    const trimmed = sql.trimStart().toUpperCase();

    if (trimmed.startsWith("SELECT") || trimmed.startsWith("PRAGMA")) {
      const rows = stmt.all(...params);
      return { rows };
    }

    const info = stmt.run(...params);
    return {
      rows: [],
      changes: info.changes,
      lastInsertId: info.lastInsertRowid,
    };
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

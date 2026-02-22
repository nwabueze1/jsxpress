import type { QueryResult } from "../adapter.js";
import type { SqlDialect } from "../sql.js";
import { SqlAdapter } from "./sql-adapter.js";

export class MysqlAdapter extends SqlAdapter {
  readonly dialect: SqlDialect = "mysql";
  private pool: any = null;
  private url: string;

  constructor(url: string) {
    super();
    this.url = url;
  }

  async connect(): Promise<void> {
    const mod = await import(/* @vite-ignore */ "mysql2/promise");
    const createPool = mod.createPool ?? (mod.default as any)?.createPool;
    this.pool = createPool(this.url);
  }

  protected async execute(sql: string, params: unknown[] = []): Promise<QueryResult> {
    const [result] = await this.pool.execute(sql, params);

    if (Array.isArray(result)) {
      return { rows: result };
    }

    return {
      rows: [],
      changes: (result as any).affectedRows,
      lastInsertId: (result as any).insertId,
    };
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

import type { QueryResult } from "../adapter.js";
import type { SqlDialect } from "../sql.js";
import { SqlAdapter } from "./sql-adapter.js";

export class PostgresAdapter extends SqlAdapter {
  readonly dialect: SqlDialect = "postgres";
  private pool: any = null;
  private url: string;

  constructor(url: string) {
    super();
    this.url = url;
  }

  async connect(): Promise<void> {
    const mod = await import(/* @vite-ignore */ "pg");
    const Pool = mod.Pool ?? (mod.default as any)?.Pool;
    this.pool = new Pool({ connectionString: this.url });
  }

  protected async execute(sql: string, params: unknown[] = []): Promise<QueryResult> {
    const result = await this.pool.query(sql, params);
    return {
      rows: result.rows ?? [],
      changes: result.rowCount ?? undefined,
    };
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

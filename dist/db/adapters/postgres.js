import { SqlAdapter } from "./sql-adapter.js";
export class PostgresAdapter extends SqlAdapter {
    dialect = "postgres";
    pool = null;
    url;
    constructor(url) {
        super();
        this.url = url;
    }
    async connect() {
        const mod = await import(/* @vite-ignore */ "pg");
        const Pool = mod.Pool ?? mod.default?.Pool;
        this.pool = new Pool({ connectionString: this.url });
    }
    async execute(sql, params = []) {
        const result = await this.pool.query(sql, params);
        return {
            rows: result.rows ?? [],
            changes: result.rowCount ?? undefined,
        };
    }
    async close() {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
        }
    }
}
//# sourceMappingURL=postgres.js.map
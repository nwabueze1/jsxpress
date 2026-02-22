import { SqlAdapter } from "./sql-adapter.js";
export class MysqlAdapter extends SqlAdapter {
    dialect = "mysql";
    pool = null;
    url;
    constructor(url) {
        super();
        this.url = url;
    }
    async connect() {
        const mod = await import(/* @vite-ignore */ "mysql2/promise");
        const createPool = mod.createPool ?? mod.default?.createPool;
        this.pool = createPool(this.url);
    }
    async execute(sql, params = []) {
        const [result] = await this.pool.execute(sql, params);
        if (Array.isArray(result)) {
            return { rows: result };
        }
        return {
            rows: [],
            changes: result.affectedRows,
            lastInsertId: result.insertId,
        };
    }
    async close() {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
        }
    }
}
//# sourceMappingURL=mysql.js.map
import { SqlAdapter } from "./sql-adapter.js";
export class SqliteAdapter extends SqlAdapter {
    dialect = "sqlite";
    db = null;
    url;
    constructor(url) {
        super();
        this.url = url;
    }
    async connect() {
        const mod = await import(/* @vite-ignore */ "better-sqlite3");
        const Database = mod.default ?? mod;
        this.db = new Database(this.url);
        this.db.pragma("journal_mode = WAL");
        this.db.pragma("foreign_keys = ON");
    }
    async execute(sql, params = []) {
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
    async close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
}
//# sourceMappingURL=sqlite.js.map
import type { QueryResult } from "../adapter.js";
import type { SqlDialect } from "../sql.js";
import { SqlAdapter } from "./sql-adapter.js";
export declare class SqliteAdapter extends SqlAdapter {
    readonly dialect: SqlDialect;
    private db;
    private url;
    constructor(url: string);
    connect(): Promise<void>;
    protected execute(sql: string, params?: unknown[]): Promise<QueryResult>;
    close(): Promise<void>;
}
//# sourceMappingURL=sqlite.d.ts.map
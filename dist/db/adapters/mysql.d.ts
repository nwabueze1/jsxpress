import type { QueryResult } from "../adapter.js";
import type { SqlDialect } from "../sql.js";
import { SqlAdapter } from "./sql-adapter.js";
export declare class MysqlAdapter extends SqlAdapter {
    readonly dialect: SqlDialect;
    private pool;
    private url;
    constructor(url: string);
    connect(): Promise<void>;
    protected execute(sql: string, params?: unknown[]): Promise<QueryResult>;
    close(): Promise<void>;
}
//# sourceMappingURL=mysql.d.ts.map
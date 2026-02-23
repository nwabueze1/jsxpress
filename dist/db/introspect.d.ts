import type { DatabaseAdapter } from "./adapter.js";
import type { SqlDialect } from "./sql.js";
export interface ColumnInfo {
    name: string;
    type: string;
    notNull: boolean;
    defaultValue: string | null;
    primaryKey: boolean;
}
export declare function introspectTable(adapter: DatabaseAdapter, tableName: string, dialect: SqlDialect): Promise<ColumnInfo[] | null>;
export declare function listTables(adapter: DatabaseAdapter, dialect: SqlDialect): Promise<string[]>;
//# sourceMappingURL=introspect.d.ts.map
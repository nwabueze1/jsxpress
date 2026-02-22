import type { DatabaseAdapter, QueryResult, WhereCondition, FindOptions } from "../adapter.js";
import type { FieldBuilder } from "../field.js";
import type { SqlDialect } from "../sql.js";
export declare abstract class SqlAdapter implements DatabaseAdapter {
    abstract readonly dialect: SqlDialect;
    abstract connect(): Promise<void>;
    abstract close(): Promise<void>;
    protected abstract execute(sql: string, params?: unknown[]): Promise<QueryResult>;
    find(table: string, where: WhereCondition[], options?: FindOptions): Promise<Record<string, unknown>[]>;
    count(table: string, where: WhereCondition[]): Promise<number>;
    insertOne(table: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
    updateMany(table: string, where: WhereCondition[], data: Record<string, unknown>): Promise<number>;
    deleteMany(table: string, where: WhereCondition[]): Promise<number>;
    createCollection(table: string, schema: Record<string, FieldBuilder>): Promise<void>;
    raw(sql: string, params?: unknown[]): Promise<QueryResult>;
    private buildWhereSQL;
}
//# sourceMappingURL=sql-adapter.d.ts.map
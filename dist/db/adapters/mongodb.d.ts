import type { DatabaseAdapter, Dialect, QueryResult, WhereCondition, FindOptions } from "../adapter.js";
import type { FieldBuilder } from "../field.js";
export declare class MongodbAdapter implements DatabaseAdapter {
    readonly dialect: Dialect;
    private client;
    private db;
    private url;
    constructor(url: string);
    connect(): Promise<void>;
    close(): Promise<void>;
    find(table: string, where: WhereCondition[], options?: FindOptions): Promise<Record<string, unknown>[]>;
    count(table: string, where: WhereCondition[]): Promise<number>;
    insertOne(table: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
    updateMany(table: string, where: WhereCondition[], data: Record<string, unknown>): Promise<number>;
    deleteMany(table: string, where: WhereCondition[]): Promise<number>;
    createCollection(table: string, _schema: Record<string, FieldBuilder>): Promise<void>;
    raw(_sql: string, _params?: unknown[]): Promise<QueryResult>;
}
//# sourceMappingURL=mongodb.d.ts.map
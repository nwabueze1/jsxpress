import type { FieldBuilder } from "./field.js";
export type Dialect = "sqlite" | "postgres" | "mysql" | "mongodb";
export interface WhereCondition {
    column: string;
    op: string;
    value: unknown;
}
export interface SortOption {
    column: string;
    direction: "asc" | "desc";
}
export interface FindOptions {
    columns?: string[];
    sort?: SortOption[];
    limit?: number;
    offset?: number;
}
export interface QueryResult {
    rows: Record<string, unknown>[];
    changes?: number;
    lastInsertId?: number | bigint;
}
export interface DatabaseAdapter {
    readonly dialect: Dialect;
    connect(): Promise<void>;
    close(): Promise<void>;
    find(table: string, where: WhereCondition[], options?: FindOptions): Promise<Record<string, unknown>[]>;
    count(table: string, where: WhereCondition[]): Promise<number>;
    insertOne(table: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
    updateMany(table: string, where: WhereCondition[], data: Record<string, unknown>): Promise<number>;
    deleteMany(table: string, where: WhereCondition[]): Promise<number>;
    createCollection(table: string, schema: Record<string, FieldBuilder>): Promise<void>;
    raw(sql: string, params?: unknown[]): Promise<QueryResult>;
}
//# sourceMappingURL=adapter.d.ts.map
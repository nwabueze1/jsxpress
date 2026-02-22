import type { DatabaseAdapter } from "./adapter.js";
export declare class QueryBuilder<T = Record<string, unknown>> {
    private adapter;
    private tableName;
    private whereClauses;
    private sortClauses;
    private limitValue?;
    private offsetValue?;
    private selectColumns;
    constructor(adapter: DatabaseAdapter, tableName: string);
    where(column: string, value: unknown): this;
    where(column: string, op: string, value: unknown): this;
    orderBy(column: string, direction?: "asc" | "desc"): this;
    limit(n: number): this;
    offset(n: number): this;
    select(...columns: string[]): this;
    findAll(): Promise<T[]>;
    findOne(): Promise<T | null>;
    count(): Promise<number>;
    create(data: Partial<T>): Promise<T>;
    update(data: Partial<T>): Promise<number>;
    delete(): Promise<number>;
}
//# sourceMappingURL=query-builder.d.ts.map
import type { DatabaseAdapter } from "./adapter.js";
import type { FieldBuilder } from "./field.js";
import type { RelationDefinition } from "./relations.js";
export interface QueryBuilderOptions {
    schema?: Record<string, FieldBuilder>;
    timestamps?: boolean;
    softDelete?: boolean;
}
export declare class QueryBuilder<T = Record<string, unknown>> {
    private adapter;
    private tableName;
    private relations;
    private whereClauses;
    private sortClauses;
    private limitValue?;
    private offsetValue?;
    private selectColumns;
    private includes;
    private schema?;
    private timestampsEnabled;
    private softDeleteEnabled;
    private includeTrashed;
    constructor(adapter: DatabaseAdapter, tableName: string, relations?: Record<string, RelationDefinition>, options?: QueryBuilderOptions);
    where(column: string, value: unknown): this;
    where(column: string, op: string, value: unknown): this;
    whereIn(column: string, values: unknown[]): this;
    include(...names: string[]): this;
    orderBy(column: string, direction?: "asc" | "desc"): this;
    limit(n: number): this;
    offset(n: number): this;
    select(...columns: string[]): this;
    withTrashed(): this;
    findAll(): Promise<T[]>;
    findOne(): Promise<T | null>;
    count(): Promise<number>;
    create(data: Partial<T>): Promise<T>;
    update(data: Partial<T>): Promise<number>;
    delete(): Promise<number>;
    forceDelete(): Promise<number>;
    private softDeleteClauses;
    private loadRelations;
}
//# sourceMappingURL=query-builder.d.ts.map
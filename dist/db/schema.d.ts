import type { DatabaseAdapter } from "./adapter.js";
import { FieldBuilder } from "./field.js";
type ColumnOp = {
    kind: "add";
    name: string;
    builder: FieldBuilder;
} | {
    kind: "drop";
    name: string;
} | {
    kind: "rename";
    from: string;
    to: string;
};
interface UniqueConstraint {
    columns: string[];
}
export declare class Blueprint {
    /** @internal */
    readonly columns: ColumnOp[];
    /** @internal */
    readonly uniqueConstraints: UniqueConstraint[];
    serial(name: string): FieldBuilder;
    text(name: string): FieldBuilder;
    integer(name: string): FieldBuilder;
    boolean(name: string): FieldBuilder;
    timestamp(name: string): FieldBuilder;
    json(name: string): FieldBuilder;
    real(name: string): FieldBuilder;
    uuid(name: string): FieldBuilder;
    timestamps(): void;
    softDeletes(): void;
    dropColumn(name: string): void;
    renameColumn(from: string, to: string): void;
    unique(columns: string[]): void;
}
type SchemaOp = {
    kind: "create";
    table: string;
    blueprint: Blueprint;
} | {
    kind: "alter";
    table: string;
    blueprint: Blueprint;
} | {
    kind: "drop";
    table: string;
    ifExists: boolean;
} | {
    kind: "rename";
    from: string;
    to: string;
} | {
    kind: "raw";
    sql: string;
    params?: unknown[];
};
export declare class Schema {
    /** @internal */
    readonly operations: SchemaOp[];
    private adapter;
    constructor(adapter: DatabaseAdapter);
    create(table: string, callback: (table: Blueprint) => void): void;
    table(table: string, callback: (table: Blueprint) => void): void;
    drop(table: string): void;
    dropIfExists(table: string): void;
    rename(from: string, to: string): void;
    raw(sql: string, params?: unknown[]): void;
    execute(): Promise<void>;
}
export {};
//# sourceMappingURL=schema.d.ts.map
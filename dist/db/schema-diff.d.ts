import type { FieldDefinition } from "./field.js";
import type { ColumnInfo } from "./introspect.js";
import type { SqlDialect } from "./sql.js";
import type { Model } from "./model.js";
export interface ModelInfo {
    table: string;
    schema: Record<string, FieldDefinition>;
}
export type DiffOperation = {
    type: "create_table";
    table: string;
    columns: Record<string, FieldDefinition>;
} | {
    type: "add_column";
    table: string;
    column: string;
    definition: FieldDefinition;
} | {
    type: "drop_column";
    table: string;
    column: string;
} | {
    type: "alter_column";
    table: string;
    column: string;
    from: ColumnInfo;
    to: FieldDefinition;
} | {
    type: "drop_table";
    table: string;
};
export declare function resolveModelSchema(model: typeof Model): Record<string, FieldDefinition>;
export declare function typesMatch(modelType: FieldDefinition["type"], dbType: string, dialect: SqlDialect): boolean;
export declare function diffSchema(models: ModelInfo[], dbTables: Map<string, ColumnInfo[]>, dialect: SqlDialect): DiffOperation[];
//# sourceMappingURL=schema-diff.d.ts.map
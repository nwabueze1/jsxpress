import type { Dialect } from "./adapter.js";
import type { FieldDefinition, FieldType } from "./field.js";
import { FieldBuilder } from "./field.js";
export type SqlDialect = Exclude<Dialect, "mongodb">;
export declare function fieldTypeToSql(type: FieldType, dialect: SqlDialect): string;
export declare function quoteIdent(name: string, dialect: Dialect): string;
export declare function placeholder(index: number, dialect: Dialect): string;
export declare function buildColumnDef(name: string, def: FieldDefinition, dialect: SqlDialect): string;
export declare function buildCreateTable(tableName: string, schema: Record<string, FieldBuilder>, dialect: SqlDialect): string;
export declare function buildCreateTableFromDefs(tableName: string, schema: Record<string, FieldDefinition>, dialect: SqlDialect): string;
//# sourceMappingURL=sql.d.ts.map
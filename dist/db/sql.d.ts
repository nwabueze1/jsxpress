import type { Dialect } from "./adapter.js";
import type { FieldType } from "./field.js";
import { FieldBuilder } from "./field.js";
export type SqlDialect = Exclude<Dialect, "mongodb">;
export declare function fieldTypeToSql(type: FieldType, dialect: SqlDialect): string;
export declare function quoteIdent(name: string, dialect: Dialect): string;
export declare function placeholder(index: number, dialect: Dialect): string;
export declare function buildCreateTable(tableName: string, schema: Record<string, FieldBuilder>, dialect: SqlDialect): string;
//# sourceMappingURL=sql.d.ts.map
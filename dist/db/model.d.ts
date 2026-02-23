import type { DatabaseAdapter } from "./adapter.js";
import type { FieldBuilder } from "./field.js";
import type { RelationDefinition } from "./relations.js";
import { QueryBuilder } from "./query-builder.js";
export declare abstract class Model {
    static table: string;
    static schema: Record<string, FieldBuilder>;
    static relations: Record<string, RelationDefinition>;
    static timestamps: boolean;
    static softDelete: boolean;
    static query<T = Record<string, unknown>>(adapter: DatabaseAdapter): QueryBuilder<T>;
    static syncTable(adapter: DatabaseAdapter): Promise<void>;
}
//# sourceMappingURL=model.d.ts.map
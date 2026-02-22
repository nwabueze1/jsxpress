import type { DatabaseAdapter } from "./adapter.js";
import type { FieldBuilder } from "./field.js";
import { QueryBuilder } from "./query-builder.js";
export declare abstract class Model {
    static table: string;
    static schema: Record<string, FieldBuilder>;
    static query<T = Record<string, unknown>>(adapter: DatabaseAdapter): QueryBuilder<T>;
    static syncTable(adapter: DatabaseAdapter): Promise<void>;
}
//# sourceMappingURL=model.d.ts.map
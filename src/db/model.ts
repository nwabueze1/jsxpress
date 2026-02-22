import type { DatabaseAdapter } from "./adapter.js";
import type { FieldBuilder } from "./field.js";
import { QueryBuilder } from "./query-builder.js";

export abstract class Model {
  static table: string;
  static schema: Record<string, FieldBuilder>;

  static query<T = Record<string, unknown>>(adapter: DatabaseAdapter): QueryBuilder<T> {
    return new QueryBuilder<T>(adapter, this.table);
  }

  static async syncTable(adapter: DatabaseAdapter): Promise<void> {
    await adapter.createCollection(this.table, this.schema);
  }
}

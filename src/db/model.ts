import type { DatabaseAdapter } from "./adapter.js";
import type { FieldBuilder } from "./field.js";
import { Field } from "./field.js";
import type { RelationDefinition } from "./relations.js";
import { QueryBuilder } from "./query-builder.js";

export abstract class Model {
  static table: string;
  static schema: Record<string, FieldBuilder>;
  static relations: Record<string, RelationDefinition> = {};
  static timestamps: boolean = false;
  static softDelete: boolean = false;

  static query<T = Record<string, unknown>>(adapter: DatabaseAdapter): QueryBuilder<T> {
    return new QueryBuilder<T>(adapter, this.table, this.relations, {
      schema: this.schema,
      timestamps: this.timestamps,
      softDelete: this.softDelete,
    });
  }

  static async syncTable(adapter: DatabaseAdapter): Promise<void> {
    const schema = { ...this.schema };

    if (this.timestamps) {
      schema.created_at = Field.timestamp().notNull();
      schema.updated_at = Field.timestamp().notNull();
    }

    if (this.softDelete) {
      schema.deleted_at = Field.timestamp();
    }

    await adapter.createCollection(this.table, schema);
  }
}

import { Field } from "./field.js";
import { QueryBuilder } from "./query-builder.js";
export class Model {
    static table;
    static schema;
    static relations = {};
    static timestamps = false;
    static softDelete = false;
    static query(adapter) {
        return new QueryBuilder(adapter, this.table, this.relations, {
            schema: this.schema,
            timestamps: this.timestamps,
            softDelete: this.softDelete,
        });
    }
    static async syncTable(adapter) {
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
//# sourceMappingURL=model.js.map
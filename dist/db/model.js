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
}
//# sourceMappingURL=model.js.map
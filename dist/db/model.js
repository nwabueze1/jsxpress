import { QueryBuilder } from "./query-builder.js";
export class Model {
    static table;
    static schema;
    static query(adapter) {
        return new QueryBuilder(adapter, this.table);
    }
    static async syncTable(adapter) {
        await adapter.createCollection(this.table, this.schema);
    }
}
//# sourceMappingURL=model.js.map
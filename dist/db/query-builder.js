export class QueryBuilder {
    adapter;
    tableName;
    whereClauses = [];
    sortClauses = [];
    limitValue;
    offsetValue;
    selectColumns = [];
    constructor(adapter, tableName) {
        this.adapter = adapter;
        this.tableName = tableName;
    }
    where(column, opOrValue, maybeValue) {
        if (maybeValue === undefined) {
            this.whereClauses.push({ column, op: "=", value: opOrValue });
        }
        else {
            this.whereClauses.push({ column, op: opOrValue, value: maybeValue });
        }
        return this;
    }
    orderBy(column, direction = "asc") {
        this.sortClauses.push({ column, direction });
        return this;
    }
    limit(n) {
        this.limitValue = n;
        return this;
    }
    offset(n) {
        this.offsetValue = n;
        return this;
    }
    select(...columns) {
        this.selectColumns = columns;
        return this;
    }
    async findAll() {
        const rows = await this.adapter.find(this.tableName, this.whereClauses, {
            columns: this.selectColumns.length > 0 ? this.selectColumns : undefined,
            sort: this.sortClauses.length > 0 ? this.sortClauses : undefined,
            limit: this.limitValue,
            offset: this.offsetValue,
        });
        return rows;
    }
    async findOne() {
        this.limitValue = 1;
        const rows = await this.findAll();
        return rows[0] ?? null;
    }
    async count() {
        return this.adapter.count(this.tableName, this.whereClauses);
    }
    async create(data) {
        const row = await this.adapter.insertOne(this.tableName, data);
        return row;
    }
    async update(data) {
        return this.adapter.updateMany(this.tableName, this.whereClauses, data);
    }
    async delete() {
        return this.adapter.deleteMany(this.tableName, this.whereClauses);
    }
}
//# sourceMappingURL=query-builder.js.map
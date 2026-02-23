import crypto from "node:crypto";
export class QueryBuilder {
    adapter;
    tableName;
    relations;
    whereClauses = [];
    sortClauses = [];
    limitValue;
    offsetValue;
    selectColumns = [];
    includes = [];
    schema;
    timestampsEnabled;
    softDeleteEnabled;
    includeTrashed = false;
    constructor(adapter, tableName, relations = {}, options = {}) {
        this.adapter = adapter;
        this.tableName = tableName;
        this.relations = relations;
        this.schema = options.schema;
        this.timestampsEnabled = options.timestamps ?? false;
        this.softDeleteEnabled = options.softDelete ?? false;
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
    whereIn(column, values) {
        this.whereClauses.push({ column, op: "in", value: values });
        return this;
    }
    include(...names) {
        this.includes.push(...names);
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
    withTrashed() {
        this.includeTrashed = true;
        return this;
    }
    async findAll() {
        const where = [...this.softDeleteClauses(), ...this.whereClauses];
        const rows = await this.adapter.find(this.tableName, where, {
            columns: this.selectColumns.length > 0 ? this.selectColumns : undefined,
            sort: this.sortClauses.length > 0 ? this.sortClauses : undefined,
            limit: this.limitValue,
            offset: this.offsetValue,
        });
        const results = rows;
        if (this.includes.length > 0 && results.length > 0) {
            await this.loadRelations(results);
        }
        return results;
    }
    async findOne() {
        this.limitValue = 1;
        const rows = await this.findAll();
        return rows[0] ?? null;
    }
    async count() {
        const where = [...this.softDeleteClauses(), ...this.whereClauses];
        return this.adapter.count(this.tableName, where);
    }
    async create(data) {
        const payload = { ...data };
        if (this.schema) {
            for (const [fieldName, builder] of Object.entries(this.schema)) {
                const def = builder.toDefinition();
                if (def.type === "uuid" && payload[fieldName] == null) {
                    payload[fieldName] = crypto.randomUUID();
                }
            }
        }
        if (this.timestampsEnabled) {
            const now = new Date().toISOString();
            payload.created_at = now;
            payload.updated_at = now;
        }
        const row = await this.adapter.insertOne(this.tableName, payload);
        return row;
    }
    async update(data) {
        const payload = { ...data };
        if (this.timestampsEnabled) {
            payload.updated_at = new Date().toISOString();
        }
        return this.adapter.updateMany(this.tableName, this.whereClauses, payload);
    }
    async delete() {
        if (this.softDeleteEnabled) {
            return this.adapter.updateMany(this.tableName, this.whereClauses, {
                deleted_at: new Date().toISOString(),
            });
        }
        return this.adapter.deleteMany(this.tableName, this.whereClauses);
    }
    async forceDelete() {
        return this.adapter.deleteMany(this.tableName, this.whereClauses);
    }
    softDeleteClauses() {
        if (!this.softDeleteEnabled || this.includeTrashed)
            return [];
        return [{ column: "deleted_at", op: "is null", value: null }];
    }
    async loadRelations(rows) {
        for (const name of this.includes) {
            const rel = this.relations[name];
            if (!rel) {
                throw new Error(`Unknown relation "${name}" on table "${this.tableName}". ` +
                    `Available relations: ${Object.keys(this.relations).join(", ") || "none"}`);
            }
            const TargetModel = rel.target();
            const targetTable = TargetModel.table;
            if (rel.type === "hasMany" || rel.type === "hasOne") {
                // FK is on the target table, pointing to this model's PK
                const pks = rows.map((r) => r["id"]);
                const related = await this.adapter.find(targetTable, [
                    { column: rel.foreignKey, op: "in", value: pks },
                ]);
                // Group by FK value
                const grouped = new Map();
                for (const row of related) {
                    const fkVal = row[rel.foreignKey];
                    const list = grouped.get(fkVal) ?? [];
                    list.push(row);
                    grouped.set(fkVal, list);
                }
                for (const row of rows) {
                    const rec = row;
                    const pk = rec["id"];
                    if (rel.type === "hasMany") {
                        rec[name] = grouped.get(pk) ?? [];
                    }
                    else {
                        rec[name] = grouped.get(pk)?.[0] ?? null;
                    }
                }
            }
            else {
                // belongsTo: FK is on this model's own table, pointing to target's PK
                const fkValues = rows
                    .map((r) => r[rel.foreignKey])
                    .filter((v) => v != null);
                const uniqueFks = [...new Set(fkValues)];
                if (uniqueFks.length === 0) {
                    for (const row of rows) {
                        row[name] = null;
                    }
                    continue;
                }
                const related = await this.adapter.find(targetTable, [
                    { column: "id", op: "in", value: uniqueFks },
                ]);
                const lookup = new Map();
                for (const row of related) {
                    lookup.set(row["id"], row);
                }
                for (const row of rows) {
                    const rec = row;
                    const fkVal = rec[rel.foreignKey];
                    rec[name] = lookup.get(fkVal) ?? null;
                }
            }
        }
    }
}
//# sourceMappingURL=query-builder.js.map
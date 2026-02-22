import { quoteIdent, placeholder, buildCreateTable } from "../sql.js";
export class SqlAdapter {
    async find(table, where, options = {}) {
        const d = this.dialect;
        const cols = options.columns?.length
            ? options.columns.map((c) => quoteIdent(c, d)).join(", ")
            : "*";
        const { whereSQL, params } = this.buildWhereSQL(where);
        let sql = `SELECT ${cols} FROM ${quoteIdent(table, d)}${whereSQL}`;
        if (options.sort?.length) {
            const parts = options.sort.map((s) => `${quoteIdent(s.column, d)} ${s.direction.toUpperCase()}`);
            sql += ` ORDER BY ${parts.join(", ")}`;
        }
        if (options.limit !== undefined) {
            sql += ` LIMIT ${options.limit}`;
        }
        if (options.offset !== undefined) {
            sql += ` OFFSET ${options.offset}`;
        }
        const result = await this.execute(sql, params);
        return result.rows;
    }
    async count(table, where) {
        const d = this.dialect;
        const { whereSQL, params } = this.buildWhereSQL(where);
        const sql = `SELECT COUNT(*) AS count FROM ${quoteIdent(table, d)}${whereSQL}`;
        const result = await this.execute(sql, params);
        return Number(result.rows[0]?.count ?? 0);
    }
    async insertOne(table, data) {
        const d = this.dialect;
        const quotedTable = quoteIdent(table, d);
        const entries = Object.entries(data);
        const cols = entries.map(([k]) => quoteIdent(k, d)).join(", ");
        const placeholders = entries.map((_, i) => placeholder(i + 1, d)).join(", ");
        const values = entries.map(([, v]) => v);
        let sql;
        if (d === "postgres") {
            sql = `INSERT INTO ${quotedTable} (${cols}) VALUES (${placeholders}) RETURNING *`;
        }
        else {
            sql = `INSERT INTO ${quotedTable} (${cols}) VALUES (${placeholders})`;
        }
        const result = await this.execute(sql, values);
        if (d === "postgres") {
            return result.rows[0];
        }
        const id = result.lastInsertId;
        if (id !== undefined) {
            const fetchSql = `SELECT * FROM ${quotedTable} WHERE rowid = ${placeholder(1, d)}`;
            const fetched = await this.execute(fetchSql, [id]);
            if (fetched.rows.length > 0)
                return fetched.rows[0];
        }
        return { ...data, id };
    }
    async updateMany(table, where, data) {
        const d = this.dialect;
        const entries = Object.entries(data);
        const setClauses = entries.map(([k], i) => `${quoteIdent(k, d)} = ${placeholder(i + 1, d)}`);
        const values = entries.map(([, v]) => v);
        const { whereSQL, params: whereParams } = this.buildWhereSQL(where, values.length);
        const sql = `UPDATE ${quoteIdent(table, d)} SET ${setClauses.join(", ")}${whereSQL}`;
        const result = await this.execute(sql, [...values, ...whereParams]);
        return result.changes ?? 0;
    }
    async deleteMany(table, where) {
        const d = this.dialect;
        const { whereSQL, params } = this.buildWhereSQL(where);
        const sql = `DELETE FROM ${quoteIdent(table, d)}${whereSQL}`;
        const result = await this.execute(sql, params);
        return result.changes ?? 0;
    }
    async createCollection(table, schema) {
        const sql = buildCreateTable(table, schema, this.dialect);
        await this.execute(sql);
    }
    async raw(sql, params = []) {
        return this.execute(sql, params);
    }
    buildWhereSQL(where, paramOffset = 0) {
        if (where.length === 0)
            return { whereSQL: "", params: [] };
        const d = this.dialect;
        const params = [];
        const parts = where.map((w, i) => {
            params.push(w.value);
            return `${quoteIdent(w.column, d)} ${w.op} ${placeholder(paramOffset + i + 1, d)}`;
        });
        return { whereSQL: ` WHERE ${parts.join(" AND ")}`, params };
    }
}
//# sourceMappingURL=sql-adapter.js.map
import type {
  DatabaseAdapter,
  QueryResult,
  WhereCondition,
  FindOptions,
} from "../adapter.js";
import type { FieldBuilder } from "../field.js";
import { quoteIdent, placeholder, buildCreateTable } from "../sql.js";
import type { SqlDialect } from "../sql.js";

export abstract class SqlAdapter implements DatabaseAdapter {
  abstract readonly dialect: SqlDialect;
  abstract connect(): Promise<void>;
  abstract close(): Promise<void>;
  protected abstract execute(sql: string, params?: unknown[]): Promise<QueryResult>;

  async find(
    table: string,
    where: WhereCondition[],
    options: FindOptions = {},
  ): Promise<Record<string, unknown>[]> {
    const d = this.dialect;
    const cols = options.columns?.length
      ? options.columns.map((c) => quoteIdent(c, d)).join(", ")
      : "*";

    const { whereSQL, params } = this.buildWhereSQL(where);
    let sql = `SELECT ${cols} FROM ${quoteIdent(table, d)}${whereSQL}`;

    if (options.sort?.length) {
      const parts = options.sort.map(
        (s) => `${quoteIdent(s.column, d)} ${s.direction.toUpperCase()}`,
      );
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

  async count(table: string, where: WhereCondition[]): Promise<number> {
    const d = this.dialect;
    const { whereSQL, params } = this.buildWhereSQL(where);
    const sql = `SELECT COUNT(*) AS count FROM ${quoteIdent(table, d)}${whereSQL}`;
    const result = await this.execute(sql, params);
    return Number(result.rows[0]?.count ?? 0);
  }

  async insertOne(
    table: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const d = this.dialect;
    const quotedTable = quoteIdent(table, d);
    const entries = Object.entries(data);
    const cols = entries.map(([k]) => quoteIdent(k, d)).join(", ");
    const placeholders = entries.map((_, i) => placeholder(i + 1, d)).join(", ");
    const values = entries.map(([, v]) => v);

    let sql: string;
    if (d === "postgres") {
      sql = `INSERT INTO ${quotedTable} (${cols}) VALUES (${placeholders}) RETURNING *`;
    } else {
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
      if (fetched.rows.length > 0) return fetched.rows[0];
    }

    return { ...data, id };
  }

  async updateMany(
    table: string,
    where: WhereCondition[],
    data: Record<string, unknown>,
  ): Promise<number> {
    const d = this.dialect;
    const entries = Object.entries(data);
    const setClauses = entries.map(
      ([k], i) => `${quoteIdent(k, d)} = ${placeholder(i + 1, d)}`,
    );
    const values = entries.map(([, v]) => v);

    const { whereSQL, params: whereParams } = this.buildWhereSQL(where, values.length);
    const sql = `UPDATE ${quoteIdent(table, d)} SET ${setClauses.join(", ")}${whereSQL}`;
    const result = await this.execute(sql, [...values, ...whereParams]);
    return result.changes ?? 0;
  }

  async deleteMany(table: string, where: WhereCondition[]): Promise<number> {
    const d = this.dialect;
    const { whereSQL, params } = this.buildWhereSQL(where);
    const sql = `DELETE FROM ${quoteIdent(table, d)}${whereSQL}`;
    const result = await this.execute(sql, params);
    return result.changes ?? 0;
  }

  async createCollection(
    table: string,
    schema: Record<string, FieldBuilder>,
  ): Promise<void> {
    const sql = buildCreateTable(table, schema, this.dialect);
    await this.execute(sql);
  }

  async raw(sql: string, params: unknown[] = []): Promise<QueryResult> {
    return this.execute(sql, params);
  }

  private buildWhereSQL(
    where: WhereCondition[],
    paramOffset = 0,
  ): { whereSQL: string; params: unknown[] } {
    if (where.length === 0) return { whereSQL: "", params: [] };

    const d = this.dialect;
    const params: unknown[] = [];
    let paramCount = paramOffset;
    const parts = where.map((w) => {
      const col = quoteIdent(w.column, d);
      const op = w.op.toLowerCase();

      if (op === "is null") {
        return `${col} IS NULL`;
      }

      if (op === "is not null") {
        return `${col} IS NOT NULL`;
      }

      if (op === "in" || op === "not in") {
        const values = w.value as unknown[];
        if (values.length === 0) {
          return op === "in" ? "1 = 0" : "1 = 1";
        }
        const placeholders = values.map((v) => {
          paramCount++;
          params.push(v);
          return placeholder(paramCount, d);
        });
        return `${col} ${w.op} (${placeholders.join(", ")})`;
      }

      paramCount++;
      params.push(w.value);
      return `${col} ${w.op} ${placeholder(paramCount, d)}`;
    });

    return { whereSQL: ` WHERE ${parts.join(" AND ")}`, params };
  }
}

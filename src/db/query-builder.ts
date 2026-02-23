import type { DatabaseAdapter, WhereCondition, SortOption } from "./adapter.js";
import type { FieldBuilder } from "./field.js";
import type { RelationDefinition } from "./relations.js";
import crypto from "node:crypto";

export interface QueryBuilderOptions {
  schema?: Record<string, FieldBuilder>;
  timestamps?: boolean;
  softDelete?: boolean;
}

export class QueryBuilder<T = Record<string, unknown>> {
  private adapter: DatabaseAdapter;
  private tableName: string;
  private relations: Record<string, RelationDefinition>;
  private whereClauses: WhereCondition[] = [];
  private sortClauses: SortOption[] = [];
  private limitValue?: number;
  private offsetValue?: number;
  private selectColumns: string[] = [];
  private includes: string[] = [];

  private schema?: Record<string, FieldBuilder>;
  private timestampsEnabled: boolean;
  private softDeleteEnabled: boolean;
  private includeTrashed: boolean = false;

  constructor(
    adapter: DatabaseAdapter,
    tableName: string,
    relations: Record<string, RelationDefinition> = {},
    options: QueryBuilderOptions = {},
  ) {
    this.adapter = adapter;
    this.tableName = tableName;
    this.relations = relations;
    this.schema = options.schema;
    this.timestampsEnabled = options.timestamps ?? false;
    this.softDeleteEnabled = options.softDelete ?? false;
  }

  where(column: string, value: unknown): this;
  where(column: string, op: string, value: unknown): this;
  where(column: string, opOrValue: unknown, maybeValue?: unknown): this {
    if (maybeValue === undefined) {
      this.whereClauses.push({ column, op: "=", value: opOrValue });
    } else {
      this.whereClauses.push({ column, op: opOrValue as string, value: maybeValue });
    }
    return this;
  }

  whereIn(column: string, values: unknown[]): this {
    this.whereClauses.push({ column, op: "in", value: values });
    return this;
  }

  include(...names: string[]): this {
    this.includes.push(...names);
    return this;
  }

  orderBy(column: string, direction: "asc" | "desc" = "asc"): this {
    this.sortClauses.push({ column, direction });
    return this;
  }

  limit(n: number): this {
    this.limitValue = n;
    return this;
  }

  offset(n: number): this {
    this.offsetValue = n;
    return this;
  }

  select(...columns: string[]): this {
    this.selectColumns = columns;
    return this;
  }

  withTrashed(): this {
    this.includeTrashed = true;
    return this;
  }

  async findAll(): Promise<T[]> {
    const where = [...this.softDeleteClauses(), ...this.whereClauses];
    const rows = await this.adapter.find(this.tableName, where, {
      columns: this.selectColumns.length > 0 ? this.selectColumns : undefined,
      sort: this.sortClauses.length > 0 ? this.sortClauses : undefined,
      limit: this.limitValue,
      offset: this.offsetValue,
    });
    const results = rows as T[];

    if (this.includes.length > 0 && results.length > 0) {
      await this.loadRelations(results);
    }

    return results;
  }

  async findOne(): Promise<T | null> {
    this.limitValue = 1;
    const rows = await this.findAll();
    return rows[0] ?? null;
  }

  async count(): Promise<number> {
    const where = [...this.softDeleteClauses(), ...this.whereClauses];
    return this.adapter.count(this.tableName, where);
  }

  async create(data: Partial<T>): Promise<T> {
    const payload = { ...(data as Record<string, unknown>) };

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
    return row as T;
  }

  async update(data: Partial<T>): Promise<number> {
    const payload = { ...(data as Record<string, unknown>) };

    if (this.timestampsEnabled) {
      payload.updated_at = new Date().toISOString();
    }

    return this.adapter.updateMany(this.tableName, this.whereClauses, payload);
  }

  async delete(): Promise<number> {
    if (this.softDeleteEnabled) {
      return this.adapter.updateMany(this.tableName, this.whereClauses, {
        deleted_at: new Date().toISOString(),
      });
    }
    return this.adapter.deleteMany(this.tableName, this.whereClauses);
  }

  async forceDelete(): Promise<number> {
    return this.adapter.deleteMany(this.tableName, this.whereClauses);
  }

  private softDeleteClauses(): WhereCondition[] {
    if (!this.softDeleteEnabled || this.includeTrashed) return [];
    return [{ column: "deleted_at", op: "is null", value: null }];
  }

  private async loadRelations(rows: T[]): Promise<void> {
    for (const name of this.includes) {
      const rel = this.relations[name];
      if (!rel) {
        throw new Error(
          `Unknown relation "${name}" on table "${this.tableName}". ` +
          `Available relations: ${Object.keys(this.relations).join(", ") || "none"}`,
        );
      }

      const TargetModel = rel.target();
      const targetTable = TargetModel.table;

      if (rel.type === "hasMany" || rel.type === "hasOne") {
        // FK is on the target table, pointing to this model's PK
        const pks = rows.map((r) => (r as Record<string, unknown>)["id"]);
        const related = await this.adapter.find(targetTable, [
          { column: rel.foreignKey, op: "in", value: pks },
        ]);

        // Group by FK value
        const grouped = new Map<unknown, Record<string, unknown>[]>();
        for (const row of related) {
          const fkVal = row[rel.foreignKey];
          const list = grouped.get(fkVal) ?? [];
          list.push(row);
          grouped.set(fkVal, list);
        }

        for (const row of rows) {
          const rec = row as Record<string, unknown>;
          const pk = rec["id"];
          if (rel.type === "hasMany") {
            rec[name] = grouped.get(pk) ?? [];
          } else {
            rec[name] = grouped.get(pk)?.[0] ?? null;
          }
        }
      } else {
        // belongsTo: FK is on this model's own table, pointing to target's PK
        const fkValues = rows
          .map((r) => (r as Record<string, unknown>)[rel.foreignKey])
          .filter((v) => v != null);
        const uniqueFks = [...new Set(fkValues)];

        if (uniqueFks.length === 0) {
          for (const row of rows) {
            (row as Record<string, unknown>)[name] = null;
          }
          continue;
        }

        const related = await this.adapter.find(targetTable, [
          { column: "id", op: "in", value: uniqueFks },
        ]);

        const lookup = new Map<unknown, Record<string, unknown>>();
        for (const row of related) {
          lookup.set(row["id"], row);
        }

        for (const row of rows) {
          const rec = row as Record<string, unknown>;
          const fkVal = rec[rel.foreignKey];
          rec[name] = lookup.get(fkVal) ?? null;
        }
      }
    }
  }
}

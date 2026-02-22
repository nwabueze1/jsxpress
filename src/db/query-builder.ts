import type { DatabaseAdapter, WhereCondition, SortOption } from "./adapter.js";

export class QueryBuilder<T = Record<string, unknown>> {
  private adapter: DatabaseAdapter;
  private tableName: string;
  private whereClauses: WhereCondition[] = [];
  private sortClauses: SortOption[] = [];
  private limitValue?: number;
  private offsetValue?: number;
  private selectColumns: string[] = [];

  constructor(adapter: DatabaseAdapter, tableName: string) {
    this.adapter = adapter;
    this.tableName = tableName;
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

  async findAll(): Promise<T[]> {
    const rows = await this.adapter.find(this.tableName, this.whereClauses, {
      columns: this.selectColumns.length > 0 ? this.selectColumns : undefined,
      sort: this.sortClauses.length > 0 ? this.sortClauses : undefined,
      limit: this.limitValue,
      offset: this.offsetValue,
    });
    return rows as T[];
  }

  async findOne(): Promise<T | null> {
    this.limitValue = 1;
    const rows = await this.findAll();
    return rows[0] ?? null;
  }

  async count(): Promise<number> {
    return this.adapter.count(this.tableName, this.whereClauses);
  }

  async create(data: Partial<T>): Promise<T> {
    const row = await this.adapter.insertOne(
      this.tableName,
      data as Record<string, unknown>,
    );
    return row as T;
  }

  async update(data: Partial<T>): Promise<number> {
    return this.adapter.updateMany(
      this.tableName,
      this.whereClauses,
      data as Record<string, unknown>,
    );
  }

  async delete(): Promise<number> {
    return this.adapter.deleteMany(this.tableName, this.whereClauses);
  }
}

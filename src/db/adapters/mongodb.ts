import type {
  DatabaseAdapter,
  Dialect,
  QueryResult,
  WhereCondition,
  FindOptions,
} from "../adapter.js";
import type { FieldBuilder } from "../field.js";

type MongoFilter = Record<string, unknown>;

const OP_MAP: Record<string, string> = {
  "=": "$eq",
  "!=": "$ne",
  ">": "$gt",
  ">=": "$gte",
  "<": "$lt",
  "<=": "$lte",
  "in": "$in",
  "not in": "$nin",
};

function toMongoColumn(column: string): string {
  return column === "id" ? "_id" : column;
}

function buildFilter(where: WhereCondition[]): MongoFilter {
  const filter: MongoFilter = {};
  for (const w of where) {
    const col = toMongoColumn(w.column);
    const op = w.op.toLowerCase();
    if (op === "is null") {
      filter[col] = null;
    } else if (op === "is not null") {
      filter[col] = { $ne: null };
    } else if (w.op === "=") {
      filter[col] = w.value;
    } else {
      const mongoOp = OP_MAP[w.op];
      if (!mongoOp) {
        throw new Error(`Unsupported operator for MongoDB: ${w.op}`);
      }
      filter[col] = { [mongoOp]: w.value };
    }
  }
  return filter;
}

function docToRow(doc: Record<string, unknown>): Record<string, unknown> {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
}

export class MongodbAdapter implements DatabaseAdapter {
  readonly dialect: Dialect = "mongodb";
  private client: any = null;
  private db: any = null;
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  async connect(): Promise<void> {
    const mod = await import(/* @vite-ignore */ "mongodb");
    const MongoClient = mod.MongoClient ?? (mod.default as any)?.MongoClient;
    this.client = new MongoClient(this.url);
    await this.client.connect();
    this.db = this.client.db();
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }

  async find(
    table: string,
    where: WhereCondition[],
    options: FindOptions = {},
  ): Promise<Record<string, unknown>[]> {
    const collection = this.db.collection(table);
    const filter = buildFilter(where);

    let cursor = collection.find(filter);

    if (options.columns?.length) {
      const projection: Record<string, number> = {};
      for (const col of options.columns) {
        projection[toMongoColumn(col)] = 1;
      }
      cursor = cursor.project(projection);
    }

    if (options.sort?.length) {
      const sort: Record<string, 1 | -1> = {};
      for (const s of options.sort) {
        sort[toMongoColumn(s.column)] = s.direction === "asc" ? 1 : -1;
      }
      cursor = cursor.sort(sort);
    }

    if (options.offset !== undefined) {
      cursor = cursor.skip(options.offset);
    }

    if (options.limit !== undefined) {
      cursor = cursor.limit(options.limit);
    }

    const docs = await cursor.toArray();
    return docs.map(docToRow);
  }

  async count(table: string, where: WhereCondition[]): Promise<number> {
    const collection = this.db.collection(table);
    const filter = buildFilter(where);
    return collection.countDocuments(filter);
  }

  async insertOne(
    table: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const collection = this.db.collection(table);
    const result = await collection.insertOne(data);
    return { id: result.insertedId, ...data };
  }

  async updateMany(
    table: string,
    where: WhereCondition[],
    data: Record<string, unknown>,
  ): Promise<number> {
    const collection = this.db.collection(table);
    const filter = buildFilter(where);
    const result = await collection.updateMany(filter, { $set: data });
    return result.modifiedCount;
  }

  async deleteMany(table: string, where: WhereCondition[]): Promise<number> {
    const collection = this.db.collection(table);
    const filter = buildFilter(where);
    const result = await collection.deleteMany(filter);
    return result.deletedCount;
  }

  async createCollection(
    table: string,
    _schema: Record<string, FieldBuilder>,
  ): Promise<void> {
    const collections = await this.db
      .listCollections({ name: table })
      .toArray();
    if (collections.length === 0) {
      await this.db.createCollection(table);
    }
  }

  async raw(_sql: string, _params?: unknown[]): Promise<QueryResult> {
    throw new Error("raw() is not supported for MongoDB. Use the operation methods instead.");
  }
}

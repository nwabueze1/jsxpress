import { describe, it, expect } from "vitest";
import { QueryBuilder } from "../src/db/query-builder.js";
import type { DatabaseAdapter, WhereCondition, FindOptions, QueryResult } from "../src/db/adapter.js";
import type { FieldBuilder } from "../src/db/field.js";
import { Model } from "../src/db/model.js";
import { Field } from "../src/db/field.js";
import { hasMany, hasOne, belongsTo } from "../src/db/relations.js";

interface AdapterCall {
  method: string;
  args: unknown[];
}

function mockAdapter(
  findResults?: Record<string, Record<string, unknown>[]>,
): { adapter: DatabaseAdapter; calls: AdapterCall[] } {
  const calls: AdapterCall[] = [];

  const adapter: DatabaseAdapter = {
    dialect: "sqlite",
    async connect() {},
    async close() {},
    async find(table: string, where: WhereCondition[], options?: FindOptions) {
      calls.push({ method: "find", args: [table, where, options] });
      return findResults?.[table] ?? [];
    },
    async count(table: string, where: WhereCondition[]) {
      calls.push({ method: "count", args: [table, where] });
      return 0;
    },
    async insertOne(table: string, data: Record<string, unknown>) {
      calls.push({ method: "insertOne", args: [table, data] });
      return { id: 1, ...data };
    },
    async updateMany(table: string, where: WhereCondition[], data: Record<string, unknown>) {
      calls.push({ method: "updateMany", args: [table, where, data] });
      return 1;
    },
    async deleteMany(table: string, where: WhereCondition[]) {
      calls.push({ method: "deleteMany", args: [table, where] });
      return 1;
    },
    async createCollection(table: string, schema: Record<string, FieldBuilder>) {
      calls.push({ method: "createCollection", args: [table, schema] });
    },
    async raw(sql: string, params?: unknown[]): Promise<QueryResult> {
      calls.push({ method: "raw", args: [sql, params] });
      return { rows: [] };
    },
  };

  return { adapter, calls };
}

describe("QueryBuilder", () => {
  describe("findAll", () => {
    it("calls find with table and empty where", async () => {
      const { adapter, calls } = mockAdapter();
      await new QueryBuilder(adapter, "users").findAll();
      expect(calls[0].method).toBe("find");
      expect(calls[0].args[0]).toBe("users");
      expect(calls[0].args[1]).toEqual([]);
    });

    it("passes where conditions to find", async () => {
      const { adapter, calls } = mockAdapter();
      await new QueryBuilder(adapter, "users").where("id", 1).findAll();
      expect(calls[0].args[1]).toEqual([{ column: "id", op: "=", value: 1 }]);
    });

    it("passes operator where conditions", async () => {
      const { adapter, calls } = mockAdapter();
      await new QueryBuilder(adapter, "users").where("age", ">", 18).findAll();
      expect(calls[0].args[1]).toEqual([{ column: "age", op: ">", value: 18 }]);
    });

    it("passes multiple where conditions", async () => {
      const { adapter, calls } = mockAdapter();
      await new QueryBuilder(adapter, "users")
        .where("active", true)
        .where("age", ">", 18)
        .findAll();
      expect(calls[0].args[1]).toEqual([
        { column: "active", op: "=", value: true },
        { column: "age", op: ">", value: 18 },
      ]);
    });

    it("passes sort options", async () => {
      const { adapter, calls } = mockAdapter();
      await new QueryBuilder(adapter, "users").orderBy("name").findAll();
      const options = calls[0].args[2] as FindOptions;
      expect(options.sort).toEqual([{ column: "name", direction: "asc" }]);
    });

    it("passes sort desc", async () => {
      const { adapter, calls } = mockAdapter();
      await new QueryBuilder(adapter, "users").orderBy("id", "desc").findAll();
      const options = calls[0].args[2] as FindOptions;
      expect(options.sort).toEqual([{ column: "id", direction: "desc" }]);
    });

    it("passes limit and offset", async () => {
      const { adapter, calls } = mockAdapter();
      await new QueryBuilder(adapter, "users").limit(10).offset(20).findAll();
      const options = calls[0].args[2] as FindOptions;
      expect(options.limit).toBe(10);
      expect(options.offset).toBe(20);
    });

    it("passes selected columns", async () => {
      const { adapter, calls } = mockAdapter();
      await new QueryBuilder(adapter, "users").select("id", "name").findAll();
      const options = calls[0].args[2] as FindOptions;
      expect(options.columns).toEqual(["id", "name"]);
    });
  });

  describe("findOne", () => {
    it("sets limit to 1", async () => {
      const { adapter, calls } = mockAdapter();
      await new QueryBuilder(adapter, "users").findOne();
      const options = calls[0].args[2] as FindOptions;
      expect(options.limit).toBe(1);
    });

    it("returns null when no rows", async () => {
      const { adapter } = mockAdapter();
      const result = await new QueryBuilder(adapter, "users").findOne();
      expect(result).toBeNull();
    });
  });

  describe("count", () => {
    it("calls count with table and where", async () => {
      const { adapter, calls } = mockAdapter();
      await new QueryBuilder(adapter, "users").count();
      expect(calls[0].method).toBe("count");
      expect(calls[0].args[0]).toBe("users");
      expect(calls[0].args[1]).toEqual([]);
    });

    it("passes where conditions to count", async () => {
      const { adapter, calls } = mockAdapter();
      await new QueryBuilder(adapter, "users").where("active", true).count();
      expect(calls[0].args[1]).toEqual([{ column: "active", op: "=", value: true }]);
    });
  });

  describe("create", () => {
    it("calls insertOne with table and data", async () => {
      const { adapter, calls } = mockAdapter();
      await new QueryBuilder(adapter, "users").create({ name: "Alice" });
      expect(calls[0].method).toBe("insertOne");
      expect(calls[0].args[0]).toBe("users");
      expect(calls[0].args[1]).toEqual({ name: "Alice" });
    });
  });

  describe("update", () => {
    it("calls updateMany with table, where, and data", async () => {
      const { adapter, calls } = mockAdapter();
      await new QueryBuilder(adapter, "users")
        .where("id", 1)
        .update({ name: "Bob" });
      expect(calls[0].method).toBe("updateMany");
      expect(calls[0].args[0]).toBe("users");
      expect(calls[0].args[1]).toEqual([{ column: "id", op: "=", value: 1 }]);
      expect(calls[0].args[2]).toEqual({ name: "Bob" });
    });
  });

  describe("delete", () => {
    it("calls deleteMany with table and where", async () => {
      const { adapter, calls } = mockAdapter();
      await new QueryBuilder(adapter, "users")
        .where("id", 1)
        .delete();
      expect(calls[0].method).toBe("deleteMany");
      expect(calls[0].args[0]).toBe("users");
      expect(calls[0].args[1]).toEqual([{ column: "id", op: "=", value: 1 }]);
    });

    it("calls deleteMany with empty where when no conditions", async () => {
      const { adapter, calls } = mockAdapter();
      await new QueryBuilder(adapter, "users").delete();
      expect(calls[0].method).toBe("deleteMany");
      expect(calls[0].args[1]).toEqual([]);
    });
  });

  describe("whereIn", () => {
    it("pushes an in where condition", async () => {
      const { adapter, calls } = mockAdapter();
      await new QueryBuilder(adapter, "users").whereIn("id", [1, 2, 3]).findAll();
      expect(calls[0].args[1]).toEqual([
        { column: "id", op: "in", value: [1, 2, 3] },
      ]);
    });
  });

  describe("uuid auto-generation", () => {
    const uuidSchema = {
      id: Field.uuid().primaryKey(),
      value: Field.text().notNull(),
    };

    it("auto-generates UUID when not provided", async () => {
      const { adapter, calls } = mockAdapter();
      const qb = new QueryBuilder(adapter, "tokens", {}, { schema: uuidSchema });
      await qb.create({ value: "abc" });

      expect(calls[0].method).toBe("insertOne");
      const data = calls[0].args[1] as Record<string, unknown>;
      expect(data.value).toBe("abc");
      expect(typeof data.id).toBe("string");
      expect((data.id as string).length).toBe(36); // UUID format
    });

    it("preserves user-supplied UUID", async () => {
      const { adapter, calls } = mockAdapter();
      const qb = new QueryBuilder(adapter, "tokens", {}, { schema: uuidSchema });
      await qb.create({ id: "custom-uuid", value: "abc" } as any);

      const data = calls[0].args[1] as Record<string, unknown>;
      expect(data.id).toBe("custom-uuid");
    });
  });

  describe("timestamps", () => {
    it("auto-sets created_at and updated_at on create", async () => {
      const { adapter, calls } = mockAdapter();
      const qb = new QueryBuilder(adapter, "posts", {}, { timestamps: true });
      await qb.create({ title: "Hello" });

      const data = calls[0].args[1] as Record<string, unknown>;
      expect(data.title).toBe("Hello");
      expect(typeof data.created_at).toBe("string");
      expect(typeof data.updated_at).toBe("string");
      expect(data.created_at).toBe(data.updated_at);
    });

    it("auto-sets updated_at on update", async () => {
      const { adapter, calls } = mockAdapter();
      const qb = new QueryBuilder(adapter, "posts", {}, { timestamps: true });
      await qb.where("id", 1).update({ title: "Hi" });

      expect(calls[0].method).toBe("updateMany");
      const data = calls[0].args[2] as Record<string, unknown>;
      expect(data.title).toBe("Hi");
      expect(typeof data.updated_at).toBe("string");
    });

    it("does not inject timestamps when disabled", async () => {
      const { adapter, calls } = mockAdapter();
      const qb = new QueryBuilder(adapter, "posts");
      await qb.create({ title: "Hello" });

      const data = calls[0].args[1] as Record<string, unknown>;
      expect(data.created_at).toBeUndefined();
      expect(data.updated_at).toBeUndefined();
    });
  });

  describe("soft delete", () => {
    it("delete() calls updateMany with deleted_at when softDelete enabled", async () => {
      const { adapter, calls } = mockAdapter();
      const qb = new QueryBuilder(adapter, "posts", {}, { softDelete: true });
      await qb.where("id", 1).delete();

      expect(calls[0].method).toBe("updateMany");
      expect(calls[0].args[0]).toBe("posts");
      const data = calls[0].args[2] as Record<string, unknown>;
      expect(typeof data.deleted_at).toBe("string");
    });

    it("forceDelete() always calls deleteMany", async () => {
      const { adapter, calls } = mockAdapter();
      const qb = new QueryBuilder(adapter, "posts", {}, { softDelete: true });
      await qb.where("id", 1).forceDelete();

      expect(calls[0].method).toBe("deleteMany");
    });

    it("findAll() auto-appends is null clause when softDelete enabled", async () => {
      const { adapter, calls } = mockAdapter();
      const qb = new QueryBuilder(adapter, "posts", {}, { softDelete: true });
      await qb.findAll();

      const where = calls[0].args[1] as WhereCondition[];
      expect(where).toEqual([{ column: "deleted_at", op: "is null", value: null }]);
    });

    it("withTrashed() skips the is null clause", async () => {
      const { adapter, calls } = mockAdapter();
      const qb = new QueryBuilder(adapter, "posts", {}, { softDelete: true });
      await qb.withTrashed().findAll();

      const where = calls[0].args[1] as WhereCondition[];
      expect(where).toEqual([]);
    });

    it("count() respects soft delete filter", async () => {
      const { adapter, calls } = mockAdapter();
      const qb = new QueryBuilder(adapter, "posts", {}, { softDelete: true });
      await qb.count();

      expect(calls[0].method).toBe("count");
      const where = calls[0].args[1] as WhereCondition[];
      expect(where).toEqual([{ column: "deleted_at", op: "is null", value: null }]);
    });

    it("delete() calls deleteMany when softDelete disabled", async () => {
      const { adapter, calls } = mockAdapter();
      const qb = new QueryBuilder(adapter, "posts");
      await qb.where("id", 1).delete();

      expect(calls[0].method).toBe("deleteMany");
    });
  });

  describe("include", () => {
    class Post extends Model {
      static table = "posts";
      static schema = {
        id: Field.serial().primaryKey(),
        userId: Field.integer().notNull(),
      };
    }

    class Profile extends Model {
      static table = "profiles";
      static schema = {
        id: Field.serial().primaryKey(),
        userId: Field.integer().notNull(),
      };
    }

    class Author extends Model {
      static table = "authors";
      static schema = {
        id: Field.serial().primaryKey(),
        name: Field.text(),
      };
    }

    const relations = {
      posts: hasMany(() => Post, "userId"),
      profile: hasOne(() => Profile, "userId"),
    };

    const belongsToRelations = {
      author: belongsTo(() => Author, "authorId"),
    };

    it("hasMany attaches array of related records", async () => {
      let callCount = 0;
      const { adapter } = mockAdapter();
      adapter.find = async () => {
        callCount++;
        if (callCount === 1) return [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }];
        // Second call: posts
        return [
          { id: 10, userId: 1, title: "Post A" },
          { id: 11, userId: 1, title: "Post B" },
          { id: 12, userId: 2, title: "Post C" },
        ];
      };

      const qb = new QueryBuilder(adapter, "users", relations);
      const results = await qb.include("posts").findAll();

      expect(results).toHaveLength(2);
      expect((results[0] as any).posts).toEqual([
        { id: 10, userId: 1, title: "Post A" },
        { id: 11, userId: 1, title: "Post B" },
      ]);
      expect((results[1] as any).posts).toEqual([
        { id: 12, userId: 2, title: "Post C" },
      ]);
    });

    it("hasOne attaches single record or null", async () => {
      let callCount = 0;
      const { adapter } = mockAdapter();
      adapter.find = async () => {
        callCount++;
        if (callCount === 1) return [{ id: 1 }, { id: 2 }];
        return [{ id: 100, userId: 1, bio: "Hello" }];
      };

      const qb = new QueryBuilder(adapter, "users", relations);
      const results = await qb.include("profile").findAll();

      expect((results[0] as any).profile).toEqual({ id: 100, userId: 1, bio: "Hello" });
      expect((results[1] as any).profile).toBeNull();
    });

    it("belongsTo attaches single record or null", async () => {
      let callCount = 0;
      const { adapter } = mockAdapter();
      adapter.find = async () => {
        callCount++;
        if (callCount === 1) return [{ id: 1, authorId: 5 }, { id: 2, authorId: null }];
        return [{ id: 5, name: "Alice" }];
      };

      const qb = new QueryBuilder(adapter, "books", belongsToRelations);
      const results = await qb.include("author").findAll();

      expect((results[0] as any).author).toEqual({ id: 5, name: "Alice" });
      expect((results[1] as any).author).toBeNull();
    });

    it("throws on unknown relation", async () => {
      const { adapter } = mockAdapter();
      adapter.find = async () => [{ id: 1 }];

      const qb = new QueryBuilder(adapter, "users", relations);
      await expect(qb.include("comments").findAll()).rejects.toThrow(
        /Unknown relation "comments"/,
      );
    });

    it("skips related queries when primary results are empty", async () => {
      const { adapter, calls } = mockAdapter();
      const qb = new QueryBuilder(adapter, "users", relations);
      const results = await qb.include("posts").findAll();

      expect(results).toEqual([]);
      expect(calls).toHaveLength(1); // only the primary query
    });
  });
});

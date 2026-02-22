import { describe, it, expect, vi } from "vitest";
import { QueryBuilder } from "../src/db/query-builder.js";
import type { DatabaseAdapter, WhereCondition, FindOptions, QueryResult } from "../src/db/adapter.js";
import type { FieldBuilder } from "../src/db/field.js";

interface AdapterCall {
  method: string;
  args: unknown[];
}

function mockAdapter(): { adapter: DatabaseAdapter; calls: AdapterCall[] } {
  const calls: AdapterCall[] = [];

  const adapter: DatabaseAdapter = {
    dialect: "sqlite",
    async connect() {},
    async close() {},
    async find(table: string, where: WhereCondition[], options?: FindOptions) {
      calls.push({ method: "find", args: [table, where, options] });
      return [];
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
});

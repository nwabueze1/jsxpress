import { describe, it, expect } from "vitest";
import { v, validateRequest } from "../src/validation.js";
import type { JsxpressRequest } from "../src/types.js";

describe("StringSchema", () => {
  it("rejects missing required value", () => {
    const schema = v.string();
    expect(schema.validate(undefined, "name")).toEqual([
      { field: "name", message: "Required" },
    ]);
  });

  it("rejects null as missing", () => {
    const schema = v.string();
    expect(schema.validate(null, "name")).toEqual([
      { field: "name", message: "Required" },
    ]);
  });

  it("allows optional undefined", () => {
    const schema = v.string().optional();
    expect(schema.validate(undefined, "name")).toEqual([]);
  });

  it("validates type", () => {
    const schema = v.string();
    expect(schema.validate(123, "name")).toEqual([
      { field: "name", message: "Expected a string" },
    ]);
  });

  it("validates min length", () => {
    const schema = v.string().min(3);
    expect(schema.validate("ab", "name")).toEqual([
      { field: "name", message: "Must be at least 3 characters" },
    ]);
    expect(schema.validate("abc", "name")).toEqual([]);
  });

  it("validates max length", () => {
    const schema = v.string().max(5);
    expect(schema.validate("abcdef", "name")).toEqual([
      { field: "name", message: "Must be at most 5 characters" },
    ]);
    expect(schema.validate("abcde", "name")).toEqual([]);
  });

  it("validates email", () => {
    const schema = v.string().email();
    expect(schema.validate("not-email", "email")).toEqual([
      { field: "email", message: "Invalid email format" },
    ]);
    expect(schema.validate("user@example.com", "email")).toEqual([]);
  });

  it("validates pattern", () => {
    const schema = v.string().pattern(/^[a-z]+$/);
    expect(schema.validate("ABC", "slug")).toHaveLength(1);
    expect(schema.validate("abc", "slug")).toEqual([]);
  });

  it("collects multiple errors", () => {
    const schema = v.string().min(5).email();
    const errors = schema.validate("ab", "email");
    expect(errors).toHaveLength(2);
  });
});

describe("NumberSchema", () => {
  it("rejects missing required value", () => {
    const schema = v.number();
    expect(schema.validate(undefined, "age")).toEqual([
      { field: "age", message: "Required" },
    ]);
  });

  it("allows optional undefined", () => {
    const schema = v.number().optional();
    expect(schema.validate(undefined, "age")).toEqual([]);
  });

  it("validates type", () => {
    const schema = v.number();
    expect(schema.validate("abc", "age")).toEqual([
      { field: "age", message: "Expected a number" },
    ]);
  });

  it("coerces numeric strings", () => {
    const schema = v.number().min(1);
    expect(schema.validate("42", "age")).toEqual([]);
    expect(schema.validate("0", "age")).toEqual([
      { field: "age", message: "Must be at least 1" },
    ]);
  });

  it("rejects empty string", () => {
    const schema = v.number();
    expect(schema.validate("", "age")).toEqual([
      { field: "age", message: "Expected a number" },
    ]);
  });

  it("validates min", () => {
    const schema = v.number().min(0);
    expect(schema.validate(-1, "age")).toEqual([
      { field: "age", message: "Must be at least 0" },
    ]);
    expect(schema.validate(0, "age")).toEqual([]);
  });

  it("validates max", () => {
    const schema = v.number().max(100);
    expect(schema.validate(101, "count")).toEqual([
      { field: "count", message: "Must be at most 100" },
    ]);
    expect(schema.validate(100, "count")).toEqual([]);
  });

  it("validates integer", () => {
    const schema = v.number().integer();
    expect(schema.validate(1.5, "count")).toEqual([
      { field: "count", message: "Must be an integer" },
    ]);
    expect(schema.validate(2, "count")).toEqual([]);
  });
});

describe("BooleanSchema", () => {
  it("rejects missing required value", () => {
    const schema = v.boolean();
    expect(schema.validate(undefined, "active")).toEqual([
      { field: "active", message: "Required" },
    ]);
  });

  it("allows optional undefined", () => {
    const schema = v.boolean().optional();
    expect(schema.validate(undefined, "active")).toEqual([]);
  });

  it("validates type", () => {
    const schema = v.boolean();
    expect(schema.validate("true", "active")).toEqual([
      { field: "active", message: "Expected a boolean" },
    ]);
    expect(schema.validate(true, "active")).toEqual([]);
    expect(schema.validate(false, "active")).toEqual([]);
  });
});

describe("ObjectSchema", () => {
  it("validates nested fields with paths", () => {
    const schema = v.object({
      name: v.string().min(1),
      age: v.number().optional(),
    });

    const errors = schema.validate({ name: "", age: "abc" }, "body");
    expect(errors).toEqual([
      { field: "body.name", message: "Must be at least 1 characters" },
      { field: "body.age", message: "Expected a number" },
    ]);
  });

  it("rejects non-object input", () => {
    const schema = v.object({ name: v.string() });
    expect(schema.validate("not-object", "body")).toEqual([
      { field: "body", message: "Expected an object" },
    ]);
  });

  it("rejects arrays as objects", () => {
    const schema = v.object({ name: v.string() });
    expect(schema.validate([], "body")).toEqual([
      { field: "body", message: "Expected an object" },
    ]);
  });

  it("reports missing required fields", () => {
    const schema = v.object({
      name: v.string(),
      email: v.string().email(),
    });
    const errors = schema.validate({}, "body");
    expect(errors).toEqual([
      { field: "body.name", message: "Required" },
      { field: "body.email", message: "Required" },
    ]);
  });

  it("passes valid objects", () => {
    const schema = v.object({
      name: v.string().min(1),
      email: v.string().email(),
    });
    expect(
      schema.validate({ name: "Alice", email: "alice@example.com" }, "body")
    ).toEqual([]);
  });
});

describe("ArraySchema", () => {
  it("rejects non-array input", () => {
    const schema = v.array(v.string());
    expect(schema.validate("not-array", "tags")).toEqual([
      { field: "tags", message: "Expected an array" },
    ]);
  });

  it("validates items with index paths", () => {
    const schema = v.array(v.number());
    const errors = schema.validate([1, "bad", 3], "ids");
    expect(errors).toEqual([
      { field: "ids[1]", message: "Expected a number" },
    ]);
  });

  it("validates min items", () => {
    const schema = v.array(v.string()).min(2);
    expect(schema.validate(["one"], "tags")).toEqual([
      { field: "tags", message: "Must have at least 2 items" },
    ]);
  });

  it("validates max items", () => {
    const schema = v.array(v.string()).max(1);
    expect(schema.validate(["a", "b"], "tags")).toEqual([
      { field: "tags", message: "Must have at most 1 items" },
    ]);
  });

  it("passes valid arrays", () => {
    const schema = v.array(v.string()).min(1);
    expect(schema.validate(["hello"], "tags")).toEqual([]);
  });
});

describe("validateRequest", () => {
  function makeRequest(overrides: Partial<JsxpressRequest> = {}): JsxpressRequest {
    return {
      raw: new Request("http://localhost/test"),
      method: "POST",
      path: "/test",
      params: {},
      query: new URLSearchParams(),
      headers: new Headers(),
      json: async () => ({}),
      text: async () => "",
      ...overrides,
    };
  }

  it("validates and returns parsed body", async () => {
    const req = makeRequest({
      json: async () => ({ name: "Alice" }),
    });

    const result = await validateRequest(req, {
      body: v.object({ name: v.string() }),
    });

    expect(result).toEqual({ body: { name: "Alice" } });
  });

  it("returns errors for invalid body", async () => {
    const req = makeRequest({
      json: async () => ({ name: 123 }),
    });

    const result = await validateRequest(req, {
      body: v.object({ name: v.string() }),
    });

    expect("errors" in result).toBe(true);
    if ("errors" in result) {
      expect(result.errors).toEqual([
        { field: "body.name", message: "Expected a string" },
      ]);
    }
  });

  it("returns error for invalid JSON", async () => {
    const req = makeRequest({
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    });

    const result = await validateRequest(req, {
      body: v.object({ name: v.string() }),
    });

    expect(result).toEqual({
      errors: [{ field: "body", message: "Invalid JSON" }],
    });
  });

  it("validates query params", async () => {
    const req = makeRequest({
      query: new URLSearchParams({ page: "abc" }),
    });

    const result = await validateRequest(req, {
      query: v.object({ page: v.number() }),
    });

    expect("errors" in result).toBe(true);
    if ("errors" in result) {
      expect(result.errors).toEqual([
        { field: "query.page", message: "Expected a number" },
      ]);
    }
  });

  it("validates query params with number coercion", async () => {
    const req = makeRequest({
      query: new URLSearchParams({ page: "2" }),
    });

    const result = await validateRequest(req, {
      query: v.object({ page: v.number().min(1) }),
    });

    expect("errors" in result).toBe(false);
  });

  it("validates route params", async () => {
    const req = makeRequest({
      params: { id: "abc" },
    });

    const result = await validateRequest(req, {
      params: v.object({ id: v.number() }),
    });

    expect("errors" in result).toBe(true);
  });

  it("returns empty result when no schemas defined", async () => {
    const req = makeRequest();
    const result = await validateRequest(req, {});
    expect(result).toEqual({});
  });
});

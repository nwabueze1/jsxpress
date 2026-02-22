import { describe, it, expect } from "vitest";
import { MongodbAdapter } from "../src/db/adapters/mongodb.js";

describe("MongodbAdapter", () => {
  it("has dialect set to mongodb", () => {
    const adapter = new MongodbAdapter("mongodb://localhost:27017/test");
    expect(adapter.dialect).toBe("mongodb");
  });

  it("raw() throws an error", async () => {
    const adapter = new MongodbAdapter("mongodb://localhost:27017/test");
    await expect(adapter.raw("SELECT 1")).rejects.toThrow(
      "raw() is not supported for MongoDB",
    );
  });
});

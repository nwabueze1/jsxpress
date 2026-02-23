import { describe, it, expect } from "vitest";
import { discoverModels } from "../src/db/model-discovery.js";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("discoverModels", () => {
  let tempDir: string;

  async function setup() {
    tempDir = await mkdtemp(join(tmpdir(), "jsxpress-model-disc-"));
  }

  async function cleanup() {
    await rm(tempDir, { recursive: true, force: true });
  }

  it("discovers Model subclasses from .js files", async () => {
    await setup();
    try {
      const modelContent = `
import { Model } from "${join(process.cwd(), "src/db/model.js")}";
import { Field } from "${join(process.cwd(), "src/db/field.js")}";

export class User extends Model {
  static table = "users";
  static schema = {
    id: Field.serial().primaryKey(),
    name: Field.text().notNull(),
  };
}
`;
      await writeFile(join(tempDir, "User.mjs"), modelContent);

      const models = await discoverModels(tempDir);
      expect(models).toHaveLength(1);
      expect(models[0].table).toBe("users");
    } finally {
      await cleanup();
    }
  });

  it("ignores non-model exports", async () => {
    await setup();
    try {
      const content = `
export const SOME_CONSTANT = "hello";
export function helper() { return 1; }
`;
      await writeFile(join(tempDir, "utils.mjs"), content);

      const models = await discoverModels(tempDir);
      expect(models).toHaveLength(0);
    } finally {
      await cleanup();
    }
  });

  it("discovers multiple models from single file", async () => {
    await setup();
    try {
      const content = `
import { Model } from "${join(process.cwd(), "src/db/model.js")}";
import { Field } from "${join(process.cwd(), "src/db/field.js")}";

export class User extends Model {
  static table = "users";
  static schema = { id: Field.serial().primaryKey() };
}

export class Post extends Model {
  static table = "posts";
  static schema = { id: Field.serial().primaryKey() };
}
`;
      await writeFile(join(tempDir, "models.mjs"), content);

      const models = await discoverModels(tempDir);
      expect(models).toHaveLength(2);
      const tables = models.map((m) => m.table).sort();
      expect(tables).toEqual(["posts", "users"]);
    } finally {
      await cleanup();
    }
  });

  it("throws if directory does not exist", async () => {
    await expect(discoverModels("/nonexistent/path")).rejects.toThrow("Models directory not found");
  });

  it("returns empty array for directory with no model files", async () => {
    await setup();
    try {
      await writeFile(join(tempDir, "README.md"), "# Hello");
      const models = await discoverModels(tempDir);
      expect(models).toHaveLength(0);
    } finally {
      await cleanup();
    }
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { generate } from "../../src/cli/commands/generate.js";
import { readFile, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("generate", () => {
  let tmp: string;
  let origCwd: string;

  beforeEach(async () => {
    tmp = join(tmpdir(), `jsxpress-gen-${Date.now()}`);
    await mkdir(join(tmp, "src"), { recursive: true });
    await mkdir(join(tmp, "migrations"), { recursive: true });
    origCwd = process.cwd();
    process.chdir(tmp);
  });

  afterEach(async () => {
    process.chdir(origCwd);
    await rm(tmp, { recursive: true, force: true });
  });

  it("generates controller at correct path", async () => {
    await generate("controller", "users", [], false);
    const content = await readFile(join(tmp, "src/controllers/users.ts"), "utf-8");
    expect(content).toContain("class Users extends Controller");
    expect(content).toContain('name = "users"');
  });

  it("generates model with parsed fields", async () => {
    await generate("model", "Post", ["title:text", "views:integer"], false);
    const content = await readFile(join(tmp, "src/models/Post.ts"), "utf-8");
    expect(content).toContain("class Post extends Model");
    expect(content).toContain("title: Field.text()");
    expect(content).toContain("views: Field.integer()");
  });

  it("generates middleware at correct path", async () => {
    await generate("middleware", "auth", [], false);
    const content = await readFile(join(tmp, "src/middleware/auth.ts"), "utf-8");
    expect(content).toContain("class Auth extends Middleware");
  });

  it("generates migration with auto-incremented number", async () => {
    await generate("migration", "create_users", [], false);
    const content = await readFile(join(tmp, "migrations/001_create_users.ts"), "utf-8");
    expect(content).toContain("up(schema");

    await generate("migration", "add_posts", [], false);
    const content2 = await readFile(join(tmp, "migrations/002_add_posts.ts"), "utf-8");
    expect(content2).toContain("down(schema");
  });

  it("prints error for unknown type", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    await generate("widget", "foo", [], false);
    const output = spy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("Unknown type: widget");
    spy.mockRestore();
  });

  it("skips existing files without --force", async () => {
    await generate("controller", "users", [], false);
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    await generate("controller", "users", [], false);
    const output = spy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("skipped");
    spy.mockRestore();
  });
});

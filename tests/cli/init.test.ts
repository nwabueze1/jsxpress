import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFile, rm, mkdir, access } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Mock prompts so init doesn't block on stdin
vi.mock("../../src/cli/utils/prompt.js", () => ({
  ask: vi.fn().mockResolvedValue("test-project"),
  select: vi.fn().mockResolvedValue("sqlite"),
  confirm: vi.fn().mockResolvedValue(true),
}));

import { init } from "../../src/cli/commands/init.js";
import { select } from "../../src/cli/utils/prompt.js";

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe("init", () => {
  let tmp: string;
  let origCwd: string;

  beforeEach(async () => {
    tmp = join(tmpdir(), `jsxpress-init-${Date.now()}`);
    await mkdir(tmp, { recursive: true });
    origCwd = process.cwd();
    process.chdir(tmp);
  });

  afterEach(async () => {
    process.chdir(origCwd);
    await rm(tmp, { recursive: true, force: true });
  });

  it("creates correct directory structure with sqlite", async () => {
    await init("my-app");
    const dir = join(tmp, "my-app");

    expect(await exists(join(dir, "package.json"))).toBe(true);
    expect(await exists(join(dir, "tsconfig.json"))).toBe(true);
    expect(await exists(join(dir, ".gitignore"))).toBe(true);
    expect(await exists(join(dir, "src", "app.tsx"))).toBe(true);
    expect(await exists(join(dir, "src", "controllers", "home.ts"))).toBe(true);
    expect(await exists(join(dir, "src", "models"))).toBe(true);
    expect(await exists(join(dir, "migrations"))).toBe(true);
  });

  it("creates structure without migrations/ when none selected", async () => {
    vi.mocked(select).mockResolvedValueOnce("none");
    await init("no-db-app");
    const dir = join(tmp, "no-db-app");

    expect(await exists(join(dir, "src", "app.tsx"))).toBe(true);
    expect(await exists(join(dir, "migrations"))).toBe(false);
    expect(await exists(join(dir, "src", "models"))).toBe(false);
  });

  it("app.tsx contains Database wrapper when dialect selected", async () => {
    vi.mocked(select).mockResolvedValueOnce("sqlite");
    await init("db-app");
    const content = await readFile(join(tmp, "db-app", "src", "app.tsx"), "utf-8");
    expect(content).toContain('<Database dialect="sqlite"');
  });

  it("app.tsx omits Database when none", async () => {
    vi.mocked(select).mockResolvedValueOnce("none");
    await init("plain-app");
    const content = await readFile(join(tmp, "plain-app", "src", "app.tsx"), "utf-8");
    expect(content).not.toContain("Database");
  });

  it("package.json includes correct DB dependency", async () => {
    vi.mocked(select).mockResolvedValueOnce("postgres");
    await init("pg-app");
    const content = await readFile(join(tmp, "pg-app", "package.json"), "utf-8");
    expect(content).toContain('"pg"');
  });
});

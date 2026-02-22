import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileWithLog } from "../../src/cli/utils/fs.js";
import { readFile, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("writeFileWithLog", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = join(tmpdir(), `jsxpress-test-${Date.now()}`);
    await mkdir(tmp, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it("creates file and parent directories", async () => {
    const filePath = join(tmp, "sub", "dir", "file.ts");
    const result = await writeFileWithLog(filePath, "hello");
    expect(result).toBe(true);
    const content = await readFile(filePath, "utf-8");
    expect(content).toBe("hello");
  });

  it("skips existing files without force", async () => {
    const filePath = join(tmp, "existing.ts");
    await writeFileWithLog(filePath, "original");
    const result = await writeFileWithLog(filePath, "overwritten");
    expect(result).toBe(false);
    const content = await readFile(filePath, "utf-8");
    expect(content).toBe("original");
  });

  it("overwrites existing files with force", async () => {
    const filePath = join(tmp, "existing.ts");
    await writeFileWithLog(filePath, "original");
    const result = await writeFileWithLog(filePath, "overwritten", true);
    expect(result).toBe(true);
    const content = await readFile(filePath, "utf-8");
    expect(content).toBe("overwritten");
  });
});

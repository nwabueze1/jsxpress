import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as child_process from "node:child_process";
import { EventEmitter } from "node:events";

vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
}));

vi.mock("../../src/server/detect.js", () => ({
  isBun: vi.fn(),
}));

import { dev } from "../../src/cli/commands/dev.js";
import { isBun } from "../../src/server/detect.js";

describe("dev", () => {
  let mockProcess: EventEmitter;
  const origExit = process.exit;

  beforeEach(() => {
    mockProcess = new EventEmitter();
    vi.mocked(child_process.spawn).mockReturnValue(mockProcess as any);
    process.exit = vi.fn() as any;
  });

  afterEach(() => {
    process.exit = origExit;
    vi.restoreAllMocks();
  });

  it("spawns bun --watch when running in bun", async () => {
    vi.mocked(isBun).mockReturnValue(true);
    await dev();
    expect(child_process.spawn).toHaveBeenCalledWith(
      "bun",
      ["--watch", "src/app.tsx"],
      expect.objectContaining({ stdio: "inherit" }),
    );
  });

  it("spawns npx tsx watch when running in node", async () => {
    vi.mocked(isBun).mockReturnValue(false);
    await dev();
    expect(child_process.spawn).toHaveBeenCalledWith(
      "npx",
      ["tsx", "watch", "src/app.tsx"],
      expect.objectContaining({ stdio: "inherit" }),
    );
  });
});

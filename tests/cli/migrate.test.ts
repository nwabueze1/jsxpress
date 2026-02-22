import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../src/db/create-adapter.js", () => ({
  createDatabaseAdapter: vi.fn(),
}));

vi.mock("../../src/db/migration.js", () => ({
  MigrationRunner: vi.fn(),
}));

import { migrate } from "../../src/cli/commands/migrate.js";
import { createDatabaseAdapter } from "../../src/db/create-adapter.js";

describe("migrate", () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    process.env.DB_DIALECT = "sqlite";
    process.env.DB_URL = "./test.db";

    const mockAdapter = {
      connect: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(createDatabaseAdapter).mockReturnValue(mockAdapter as any);
  });

  afterEach(() => {
    process.env = { ...origEnv };
    vi.restoreAllMocks();
  });

  it("prints error when env vars are missing", async () => {
    delete process.env.DB_DIALECT;
    delete process.env.DB_URL;
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    await migrate("up");
    const output = spy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("Missing DB_DIALECT or DB_URL");
    spy.mockRestore();
  });

  it("routes to correct subcommand", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    await migrate("reset");
    const output = spy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("Unknown migrate subcommand: reset");

    // Verify adapter was created and connected
    expect(createDatabaseAdapter).toHaveBeenCalledWith("sqlite", "./test.db");
    spy.mockRestore();
  });
});

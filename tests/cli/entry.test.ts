import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock all command modules to avoid side effects
vi.mock("../../src/cli/commands/init.js", () => ({
  init: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../src/cli/commands/generate.js", () => ({
  generate: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../src/cli/commands/dev.js", () => ({
  dev: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../src/cli/commands/build.js", () => ({
  build: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../src/cli/commands/migrate.js", () => ({
  migrate: vi.fn().mockResolvedValue(undefined),
}));

// We test the parsing logic by importing and testing the internal behavior
// Since the CLI uses process.argv, we simulate by testing the module's behavior
describe("CLI entry point", () => {
  it("--help prints usage info", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const origArgv = process.argv;
    process.argv = ["node", "jsxpress", "--help"];

    // Re-import to trigger main()
    vi.resetModules();
    // Re-apply mocks after resetModules
    vi.doMock("../../src/cli/commands/init.js", () => ({
      init: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock("../../src/cli/commands/generate.js", () => ({
      generate: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock("../../src/cli/commands/dev.js", () => ({
      dev: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock("../../src/cli/commands/build.js", () => ({
      build: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock("../../src/cli/commands/migrate.js", () => ({
      migrate: vi.fn().mockResolvedValue(undefined),
    }));

    await import("../../src/cli/index.js");
    // Wait for the async main() to complete
    await new Promise((r) => setTimeout(r, 50));

    const output = spy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("Usage: jsxserve");
    expect(output).toContain("init");
    expect(output).toContain("generate");
    expect(output).toContain("dev");

    process.argv = origArgv;
    spy.mockRestore();
  });

  it("unknown command prints error and help", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const origArgv = process.argv;
    process.argv = ["node", "jsxpress", "foobar"];

    vi.resetModules();
    vi.doMock("../../src/cli/commands/init.js", () => ({
      init: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock("../../src/cli/commands/generate.js", () => ({
      generate: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock("../../src/cli/commands/dev.js", () => ({
      dev: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock("../../src/cli/commands/build.js", () => ({
      build: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock("../../src/cli/commands/migrate.js", () => ({
      migrate: vi.fn().mockResolvedValue(undefined),
    }));

    await import("../../src/cli/index.js");
    await new Promise((r) => setTimeout(r, 50));

    const output = spy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("Unknown command: foobar");
    expect(output).toContain("Usage: jsxserve");

    process.argv = origArgv;
    spy.mockRestore();
  });

  it("g is alias for generate", async () => {
    const origArgv = process.argv;
    process.argv = ["node", "jsxpress", "g", "controller", "users"];

    vi.resetModules();
    const mockGenerate = vi.fn().mockResolvedValue(undefined);
    vi.doMock("../../src/cli/commands/init.js", () => ({
      init: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock("../../src/cli/commands/generate.js", () => ({
      generate: mockGenerate,
    }));
    vi.doMock("../../src/cli/commands/dev.js", () => ({
      dev: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock("../../src/cli/commands/build.js", () => ({
      build: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock("../../src/cli/commands/migrate.js", () => ({
      migrate: vi.fn().mockResolvedValue(undefined),
    }));

    await import("../../src/cli/index.js");
    await new Promise((r) => setTimeout(r, 50));

    expect(mockGenerate).toHaveBeenCalledWith("controller", "users", [], false);

    process.argv = origArgv;
  });
});

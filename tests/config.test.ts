import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, unlinkSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { jsx } from "../src/jsx-runtime.js";
import { compileTree } from "../src/tree.js";
import { App } from "../src/components/App.js";
import { Controller } from "../src/components/Controller.js";
import { parseEnvFile, validateConfig, Config } from "../src/config/config.js";
import { v } from "../src/validation.js";

// ─── parseEnvFile ───────────────────────────────────────────────

describe("parseEnvFile", () => {
  let dir: string;
  let envPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "jsxpress-config-"));
    envPath = join(dir, ".env");
  });

  afterEach(() => {
    try { unlinkSync(envPath); } catch {}
  });

  it("parses KEY=VALUE pairs", () => {
    writeFileSync(envPath, "FOO=bar\nBAZ=qux\n");
    expect(parseEnvFile(envPath)).toEqual({ FOO: "bar", BAZ: "qux" });
  });

  it("strips double quotes", () => {
    writeFileSync(envPath, 'NAME="hello world"\n');
    expect(parseEnvFile(envPath)).toEqual({ NAME: "hello world" });
  });

  it("strips single quotes", () => {
    writeFileSync(envPath, "NAME='hello world'\n");
    expect(parseEnvFile(envPath)).toEqual({ NAME: "hello world" });
  });

  it("ignores comments", () => {
    writeFileSync(envPath, "# this is a comment\nKEY=value\n");
    expect(parseEnvFile(envPath)).toEqual({ KEY: "value" });
  });

  it("ignores empty lines", () => {
    writeFileSync(envPath, "\n\nKEY=value\n\n");
    expect(parseEnvFile(envPath)).toEqual({ KEY: "value" });
  });

  it("handles whitespace around =", () => {
    writeFileSync(envPath, "KEY = value\n");
    expect(parseEnvFile(envPath)).toEqual({ KEY: "value" });
  });

  it("returns empty object for missing file", () => {
    expect(parseEnvFile("/nonexistent/.env")).toEqual({});
  });
});

// ─── validateConfig ─────────────────────────────────────────────

describe("validateConfig", () => {
  it("validates required fields", () => {
    const schema = { NAME: v.string() };
    expect(() => validateConfig({}, schema)).toThrow("Config validation failed");
  });

  it("passes optional fields when absent", () => {
    const schema = { NAME: v.string().optional() };
    const result = validateConfig({}, schema);
    expect(result).toEqual({});
  });

  it("coerces string to number", () => {
    const schema = { PORT: v.number() };
    const result = validateConfig({ PORT: "3000" }, schema);
    expect(result.PORT).toBe(3000);
  });

  it("coerces string 'true' to boolean", () => {
    const schema = { DEBUG: v.boolean() };
    expect(validateConfig({ DEBUG: "true" }, schema).DEBUG).toBe(true);
  });

  it("coerces string 'false' to boolean", () => {
    const schema = { DEBUG: v.boolean() };
    expect(validateConfig({ DEBUG: "false" }, schema).DEBUG).toBe(false);
  });

  it("coerces '1' to true", () => {
    const schema = { FLAG: v.boolean() };
    expect(validateConfig({ FLAG: "1" }, schema).FLAG).toBe(true);
  });

  it("coerces '0' to false", () => {
    const schema = { FLAG: v.boolean() };
    expect(validateConfig({ FLAG: "0" }, schema).FLAG).toBe(false);
  });

  it("coerces 'yes' to true", () => {
    const schema = { FLAG: v.boolean() };
    expect(validateConfig({ FLAG: "yes" }, schema).FLAG).toBe(true);
  });

  it("coerces 'no' to false", () => {
    const schema = { FLAG: v.boolean() };
    expect(validateConfig({ FLAG: "no" }, schema).FLAG).toBe(false);
  });

  it("throws on invalid number coercion", () => {
    const schema = { PORT: v.number() };
    expect(() => validateConfig({ PORT: "abc" }, schema)).toThrow(
      "Config validation failed"
    );
  });

  it("applies validation rules after coercion", () => {
    const schema = { PORT: v.number().min(1).max(65535) };
    expect(validateConfig({ PORT: "8080" }, schema).PORT).toBe(8080);
    expect(() => validateConfig({ PORT: "0" }, schema)).toThrow(
      "Config validation failed"
    );
  });

  it("reports multiple errors at once", () => {
    const schema = { A: v.string(), B: v.number() };
    try {
      validateConfig({}, schema);
      expect.unreachable("should have thrown");
    } catch (e: any) {
      expect(e.message).toContain("A: Required");
      expect(e.message).toContain("B: Required");
    }
  });

  it("passes through non-string values", () => {
    const schema = { COUNT: v.number(), ACTIVE: v.boolean() };
    const result = validateConfig({ COUNT: 42, ACTIVE: true }, schema);
    expect(result.COUNT).toBe(42);
    expect(result.ACTIVE).toBe(true);
  });
});

// ─── Config Provider (JSX integration) ─────────────────────────

describe("Config Provider", () => {
  let dir: string;
  let envPath: string;
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "jsxpress-config-"));
    envPath = join(dir, ".env");
  });

  afterEach(() => {
    try { unlinkSync(envPath); } catch {}
    for (const key of Object.keys(savedEnv)) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
  });

  function setEnv(key: string, value: string) {
    savedEnv[key] = process.env[key];
    process.env[key] = value;
  }

  it("injects config into controllers via this.config()", () => {
    class Reader extends Controller {
      name = "reader";
      get() {
        return this.config<{ APP: string }>();
      }
    }

    const tree = jsx(App, {
      children: jsx(Config, {
        schema: { APP: v.string() },
        values: { APP: "myapp" },
        children: jsx(Reader, {}),
      }),
    });

    const { table } = compileTree(tree);
    const route = table.get("/reader")!.get("GET")!;
    expect(route.handler({} as any)).toEqual({ APP: "myapp" });
  });

  it("freezes config object", () => {
    class Mutator extends Controller {
      name = "mutator";
      get() {
        const cfg = this.config<{ KEY: string }>();
        return { frozen: Object.isFrozen(cfg) };
      }
    }

    const tree = jsx(App, {
      children: jsx(Config, {
        schema: { KEY: v.string() },
        values: { KEY: "val" },
        children: jsx(Mutator, {}),
      }),
    });

    const { table } = compileTree(tree);
    const route = table.get("/mutator")!.get("GET")!;
    expect(route.handler({} as any)).toEqual({ frozen: true });
  });

  it("crashes on invalid config at compile time", () => {
    class Dummy extends Controller {
      name = "dummy";
      get() { return {}; }
    }

    expect(() => {
      const tree = jsx(App, {
        children: jsx(Config, {
          schema: { REQUIRED: v.string() },
          children: jsx(Dummy, {}),
        }),
      });
      compileTree(tree);
    }).toThrow("Config validation failed");
  });

  it("reads process.env for schema keys only", () => {
    setEnv("CFG_KEY", "from-env");
    setEnv("SECRET", "should-not-leak");

    class EnvReader extends Controller {
      name = "env-reader";
      get() {
        return this.config<{ CFG_KEY: string }>();
      }
    }

    const tree = jsx(App, {
      children: jsx(Config, {
        schema: { CFG_KEY: v.string() },
        children: jsx(EnvReader, {}),
      }),
    });

    const { table } = compileTree(tree);
    const route = table.get("/env-reader")!.get("GET")!;
    const result = route.handler({} as any) as Record<string, unknown>;
    expect(result).toEqual({ CFG_KEY: "from-env" });
    expect(result).not.toHaveProperty("SECRET");
  });

  it("inline values override env and .env file", () => {
    setEnv("PRIORITY", "from-process-env");
    writeFileSync(envPath, "PRIORITY=from-dotenv\n");

    class PriorityReader extends Controller {
      name = "priority";
      get() {
        return this.config<{ PRIORITY: string }>();
      }
    }

    const tree = jsx(App, {
      children: jsx(Config, {
        schema: { PRIORITY: v.string() },
        env: envPath,
        values: { PRIORITY: "inline-wins" },
        children: jsx(PriorityReader, {}),
      }),
    });

    const { table } = compileTree(tree);
    const route = table.get("/priority")!.get("GET")!;
    expect(route.handler({} as any)).toEqual({ PRIORITY: "inline-wins" });
  });

  it(".env file overrides process.env", () => {
    setEnv("LAYER", "from-process");
    writeFileSync(envPath, "LAYER=from-file\n");

    class LayerReader extends Controller {
      name = "layer";
      get() {
        return this.config<{ LAYER: string }>();
      }
    }

    const tree = jsx(App, {
      children: jsx(Config, {
        schema: { LAYER: v.string() },
        env: envPath,
        children: jsx(LayerReader, {}),
      }),
    });

    const { table } = compileTree(tree);
    const route = table.get("/layer")!.get("GET")!;
    expect(route.handler({} as any)).toEqual({ LAYER: "from-file" });
  });

  it("scoped config does not leak to siblings", () => {
    class ScopedReader extends Controller {
      name = "scoped";
      get() {
        return this.config<{ VAL: string }>();
      }
    }

    class UnscopedReader extends Controller {
      name = "unscoped";
      get() {
        return this.config<{ VAL: string }>();
      }
    }

    const tree = jsx(App, {
      children: [
        jsx(Config, {
          schema: { VAL: v.string() },
          values: { VAL: "inner" },
          children: jsx(ScopedReader, {}),
        }),
        jsx(UnscopedReader, {}),
      ],
    });

    const { table } = compileTree(tree);

    const scopedRoute = table.get("/scoped")!.get("GET")!;
    expect(scopedRoute.handler({} as any)).toEqual({ VAL: "inner" });

    const unscopedRoute = table.get("/unscoped")!.get("GET")!;
    expect(() => unscopedRoute.handler({} as any)).toThrow("Context not found");
  });

  it("supports different config per subtree", () => {
    class TreeReader extends Controller {
      name: string;
      constructor(props: { path?: string }) {
        super();
        this.name = props.path ?? "reader";
      }
      get() {
        return this.config<{ MODE: string }>();
      }
    }

    const tree = jsx(App, {
      children: [
        jsx(Config, {
          schema: { MODE: v.string() },
          values: { MODE: "alpha" },
          children: jsx(TreeReader, { path: "alpha" }),
        }),
        jsx(Config, {
          schema: { MODE: v.string() },
          values: { MODE: "beta" },
          children: jsx(TreeReader, { path: "beta" }),
        }),
      ],
    });

    const { table } = compileTree(tree);

    const alphaRoute = table.get("/alpha")!.get("GET")!;
    expect(alphaRoute.handler({} as any)).toEqual({ MODE: "alpha" });

    const betaRoute = table.get("/beta")!.get("GET")!;
    expect(betaRoute.handler({} as any)).toEqual({ MODE: "beta" });
  });
});

import { describe, it, expect, afterEach } from "vitest";
import { jsx } from "../src/jsx-runtime.js";
import { compileTree } from "../src/tree.js";
import { serve } from "../src/index.js";
import { Controller } from "../src/components/Controller.js";
import { Provider } from "../src/components/Provider.js";
import { App } from "../src/components/App.js";
import type { ServerHandle } from "../src/server/types.js";

const CONFIG_KEY = Symbol("config");

interface AppConfig {
  appName: string;
  version: number;
}

class ConfigProvider extends Provider {
  contextKey = CONFIG_KEY;
  private config: AppConfig;

  constructor(props: { appName: string; version: number; children?: unknown }) {
    super();
    this.config = { appName: props.appName, version: props.version };
  }

  getContextValue(): AppConfig {
    return this.config;
  }
}

class ConfigReader extends Controller {
  name = "config";
  get() {
    const config = this.context<AppConfig>(CONFIG_KEY);
    return { appName: config.appName, version: config.version };
  }
}

describe("context/provider", () => {
  it("compileTree collects providers", () => {
    const tree = jsx(App, {
      children: jsx(ConfigProvider, {
        appName: "test",
        version: 1,
        children: jsx(ConfigReader, {}),
      }),
    });
    const { providers } = compileTree(tree);
    expect(providers).toHaveLength(1);
    expect(providers[0]).toBeInstanceOf(ConfigProvider);
  });

  it("injects context values into controllers", () => {
    const tree = jsx(App, {
      children: jsx(ConfigProvider, {
        appName: "myapp",
        version: 2,
        children: jsx(ConfigReader, {}),
      }),
    });
    const { table } = compileTree(tree);
    const route = table.get("/config")!.get("GET")!;
    const result = route.handler({} as any);
    expect(result).toEqual({ appName: "myapp", version: 2 });
  });

  it("throws when context key is missing", () => {
    class NoProviderController extends Controller {
      name = "fail";
      get() {
        return this.context(Symbol("nonexistent"));
      }
    }

    const tree = jsx(App, {
      children: jsx(NoProviderController, {}),
    });
    const { table } = compileTree(tree);
    const route = table.get("/fail")!.get("GET")!;
    expect(() => route.handler({} as any)).toThrow("Context not found");
  });

  it("supports multiple providers", () => {
    const DB_KEY = Symbol("db");

    class DbProvider extends Provider {
      contextKey = DB_KEY;
      getContextValue() { return { connected: true }; }
    }

    class MultiReader extends Controller {
      name = "multi";
      get() {
        const config = this.context<AppConfig>(CONFIG_KEY);
        const db = this.context<{ connected: boolean }>(DB_KEY);
        return { appName: config.appName, connected: db.connected };
      }
    }

    const tree = jsx(App, {
      children: jsx(ConfigProvider, {
        appName: "multi",
        version: 1,
        children: jsx(DbProvider, {
          children: jsx(MultiReader, {}),
        }),
      }),
    });
    const { table, providers } = compileTree(tree);
    expect(providers).toHaveLength(2);

    const route = table.get("/multi")!.get("GET")!;
    const result = route.handler({} as any);
    expect(result).toEqual({ appName: "multi", connected: true });
  });

  it("context does not leak to sibling branches", () => {
    const SCOPED_KEY = Symbol("scoped");

    class ScopedProvider extends Provider {
      contextKey = SCOPED_KEY;
      getContextValue() { return "scoped-value"; }
    }

    class ScopedReader extends Controller {
      name = "scoped";
      get() {
        return { value: this.context<string>(SCOPED_KEY) };
      }
    }

    class UnscoppedReader extends Controller {
      name = "unscoped";
      get() {
        return this.context<string>(SCOPED_KEY);
      }
    }

    const tree = jsx(App, {
      children: [
        jsx(ScopedProvider, {
          children: jsx(ScopedReader, {}),
        }),
        jsx(UnscoppedReader, {}),
      ],
    });
    const { table } = compileTree(tree);

    // Scoped reader should work
    const scopedRoute = table.get("/scoped")!.get("GET")!;
    expect(scopedRoute.handler({} as any)).toEqual({ value: "scoped-value" });

    // Unscoped reader should throw
    const unscopedRoute = table.get("/unscoped")!.get("GET")!;
    expect(() => unscopedRoute.handler({} as any)).toThrow("Context not found");
  });
});

describe("provider lifecycle", () => {
  let handle: ServerHandle | undefined;

  afterEach(async () => {
    if (handle) {
      await handle.close();
      handle = undefined;
    }
  });

  it("calls startup and shutdown on providers", async () => {
    const events: string[] = [];

    class LifecycleProvider extends Provider {
      contextKey = Symbol("lifecycle");
      getContextValue() { return "alive"; }
      async startup() { events.push("startup"); }
      async shutdown() { events.push("shutdown"); }
    }

    class Ping extends Controller {
      name = "ping";
      get() { return "pong"; }
    }

    const tree = jsx(App, {
      port: 0,
      children: jsx(LifecycleProvider, {
        children: jsx(Ping, {}),
      }),
    });

    handle = await serve(tree);
    expect(events).toEqual(["startup"]);

    await handle.close();
    expect(events).toEqual(["startup", "shutdown"]);
    handle = undefined; // already closed
  });
});

import { describe, it, expect, afterEach } from "vitest";
import { jsx } from "../src/jsx-runtime.js";
import { compileTree } from "../src/tree.js";
import { serve } from "../src/index.js";
import { Controller } from "../src/components/Controller.js";
import { Provider } from "../src/components/Provider.js";
import { App } from "../src/components/App.js";
import { CACHE_KEY } from "../src/cache/cache.js";
import type { CacheAdapter } from "../src/cache/adapter.js";
import type { ServerHandle } from "../src/server/types.js";

class MockCacheAdapter implements CacheAdapter {
  initialized = false;
  closed = false;
  store = new Map<string, unknown>();

  async initialize() {
    this.initialized = true;
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const val = this.store.get(key);
    return val !== undefined ? (val as T) : null;
  }

  async set(key: string, value: unknown): Promise<void> {
    this.store.set(key, value);
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async has(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  async close() {
    this.closed = true;
  }
}

class MockCacheProvider extends Provider {
  contextKey = CACHE_KEY;
  adapter: MockCacheAdapter;

  constructor(props: { adapter: MockCacheAdapter; children?: unknown }) {
    super();
    this.adapter = props.adapter;
  }

  getContextValue() {
    return this.adapter;
  }

  async startup() {
    if (this.adapter.initialize) await this.adapter.initialize();
  }

  async shutdown() {
    if (this.adapter.close) await this.adapter.close();
  }
}

class CacheController extends Controller {
  name = "cached";

  get() {
    const c = this.cache();
    return { hasCache: !!c };
  }
}

describe("Cache provider", () => {
  it("compileTree collects cache provider", () => {
    const adapter = new MockCacheAdapter();
    const tree = jsx(App, {
      children: jsx(MockCacheProvider, {
        adapter,
        children: jsx(CacheController, {}),
      }),
    });
    const { providers } = compileTree(tree);
    expect(providers).toHaveLength(1);
    expect(providers[0]).toBeInstanceOf(MockCacheProvider);
  });

  it("injects cache adapter into controller via this.cache()", () => {
    const adapter = new MockCacheAdapter();
    const tree = jsx(App, {
      children: jsx(MockCacheProvider, {
        adapter,
        children: jsx(CacheController, {}),
      }),
    });
    const { table } = compileTree(tree);
    const route = table.get("/cached")!.get("GET")!;
    const result = route.handler({} as any);
    expect(result).toEqual({ hasCache: true });
  });
});

describe("Cache provider lifecycle", () => {
  let handle: ServerHandle | undefined;

  afterEach(async () => {
    if (handle) {
      await handle.close();
      handle = undefined;
    }
  });

  it("calls initialize on startup and close on shutdown", async () => {
    const adapter = new MockCacheAdapter();

    class Ping extends Controller {
      name = "ping";
      get() { return "pong"; }
    }

    const tree = jsx(App, {
      port: 0,
      children: jsx(MockCacheProvider, {
        adapter,
        children: jsx(Ping, {}),
      }),
    });

    handle = await serve(tree);
    expect(adapter.initialized).toBe(true);
    expect(adapter.closed).toBe(false);

    await handle.close();
    expect(adapter.closed).toBe(true);
    handle = undefined;
  });
});

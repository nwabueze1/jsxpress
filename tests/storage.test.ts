import { describe, it, expect, afterEach } from "vitest";
import { jsx } from "../src/jsx-runtime.js";
import { compileTree } from "../src/tree.js";
import { serve } from "../src/index.js";
import { Controller } from "../src/components/Controller.js";
import { Provider } from "../src/components/Provider.js";
import { App } from "../src/components/App.js";
import { STORAGE_KEY } from "../src/storage/storage.js";
import type { StorageAdapter, StorageResult, StorageObject } from "../src/storage/adapter.js";
import type { ServerHandle } from "../src/server/types.js";

class MockStorageAdapter implements StorageAdapter {
  initialized = false;
  closed = false;
  store = new Map<string, { data: Buffer; contentType: string }>();

  async initialize() {
    this.initialized = true;
  }

  async put(key: string, data: Blob | ReadableStream | Buffer): Promise<StorageResult> {
    let buf: Buffer;
    if (data instanceof Blob) {
      buf = Buffer.from(await data.arrayBuffer());
    } else {
      buf = data as Buffer;
    }
    this.store.set(key, { data: buf, contentType: "application/octet-stream" });
    return { key, url: `https://mock/${key}`, size: buf.length };
  }

  async get(key: string): Promise<StorageObject | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(entry.data);
        controller.close();
      },
    });
    return { key, body: stream, contentType: entry.contentType, size: entry.data.length };
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  async getUrl(key: string): Promise<string> {
    return `https://mock/${key}`;
  }

  async close() {
    this.closed = true;
  }
}

class MockStorageProvider extends Provider {
  contextKey = STORAGE_KEY;
  adapter: MockStorageAdapter;

  constructor(props: { adapter: MockStorageAdapter; children?: unknown }) {
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

class UploadController extends Controller {
  name = "upload";

  get() {
    const s = this.storage();
    return { hasStorage: !!s };
  }
}

describe("Storage provider", () => {
  it("compileTree collects storage provider", () => {
    const adapter = new MockStorageAdapter();
    const tree = jsx(App, {
      children: jsx(MockStorageProvider, {
        adapter,
        children: jsx(UploadController, {}),
      }),
    });
    const { providers } = compileTree(tree);
    expect(providers).toHaveLength(1);
    expect(providers[0]).toBeInstanceOf(MockStorageProvider);
  });

  it("injects storage adapter into controller via this.storage()", () => {
    const adapter = new MockStorageAdapter();
    const tree = jsx(App, {
      children: jsx(MockStorageProvider, {
        adapter,
        children: jsx(UploadController, {}),
      }),
    });
    const { table } = compileTree(tree);
    const route = table.get("/upload")!.get("GET")!;
    const result = route.handler({} as any);
    expect(result).toEqual({ hasStorage: true });
  });
});

describe("Storage provider lifecycle", () => {
  let handle: ServerHandle | undefined;

  afterEach(async () => {
    if (handle) {
      await handle.close();
      handle = undefined;
    }
  });

  it("calls initialize on startup and close on shutdown", async () => {
    const adapter = new MockStorageAdapter();

    class Ping extends Controller {
      name = "ping";
      get() { return "pong"; }
    }

    const tree = jsx(App, {
      port: 0,
      children: jsx(MockStorageProvider, {
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

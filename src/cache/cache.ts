import { Provider } from "../components/Provider.js";
import type { CacheAdapter, CacheDriver } from "./adapter.js";
import { createCacheAdapter } from "./create-adapter.js";

export const CACHE_KEY: unique symbol = Symbol.for("jsxpress.cache");

export interface CacheProps {
  driver: CacheDriver;
  redisUrl?: string;
  children?: unknown;
}

export class Cache extends Provider {
  contextKey = CACHE_KEY;
  private adapter: CacheAdapter;

  constructor(props: CacheProps) {
    super();
    switch (props.driver) {
      case "memory":
        this.adapter = createCacheAdapter("memory");
        break;
      case "redis":
        this.adapter = createCacheAdapter("redis", {
          url: props.redisUrl!,
        });
        break;
      default:
        throw new Error(`Unsupported cache driver: ${props.driver}`);
    }
  }

  getContextValue(): CacheAdapter {
    return this.adapter;
  }

  async startup(): Promise<void> {
    if (this.adapter.initialize) {
      await this.adapter.initialize();
    }
  }

  async shutdown(): Promise<void> {
    if (this.adapter.close) {
      await this.adapter.close();
    }
  }
}

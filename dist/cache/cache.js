import { Provider } from "../components/Provider.js";
import { createCacheAdapter } from "./create-adapter.js";
export const CACHE_KEY = Symbol.for("jsxpress.cache");
export class Cache extends Provider {
    contextKey = CACHE_KEY;
    adapter;
    constructor(props) {
        super();
        switch (props.driver) {
            case "memory":
                this.adapter = createCacheAdapter("memory");
                break;
            case "redis":
                this.adapter = createCacheAdapter("redis", {
                    url: props.redisUrl,
                });
                break;
            default:
                throw new Error(`Unsupported cache driver: ${props.driver}`);
        }
    }
    getContextValue() {
        return this.adapter;
    }
    async startup() {
        if (this.adapter.initialize) {
            await this.adapter.initialize();
        }
    }
    async shutdown() {
        if (this.adapter.close) {
            await this.adapter.close();
        }
    }
}
//# sourceMappingURL=cache.js.map
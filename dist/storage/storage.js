import { Provider } from "../components/Provider.js";
import { createStorageAdapter } from "./create-adapter.js";
export const STORAGE_KEY = Symbol.for("jsxpress.storage");
export class Storage extends Provider {
    contextKey = STORAGE_KEY;
    adapter;
    constructor(props) {
        super();
        switch (props.driver) {
            case "s3":
                this.adapter = createStorageAdapter("s3", {
                    bucket: props.bucket,
                    region: props.region,
                    endpoint: props.endpoint,
                    credentials: props.credentials,
                });
                break;
            case "gcs":
                this.adapter = createStorageAdapter("gcs", {
                    bucket: props.bucket,
                    projectId: props.projectId,
                    keyFilename: props.keyFilename,
                });
                break;
            case "azure":
                this.adapter = createStorageAdapter("azure", {
                    container: props.container,
                    connectionString: props.connectionString,
                });
                break;
            default:
                throw new Error(`Unsupported storage driver: ${props.driver}`);
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
//# sourceMappingURL=storage.js.map
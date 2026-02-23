import { Provider } from "../components/Provider.js";
import type { StorageAdapter } from "./adapter.js";
import { createStorageAdapter } from "./create-adapter.js";
import type { StorageDriver } from "./create-adapter.js";

export const STORAGE_KEY: unique symbol = Symbol.for("jsxpress.storage");

export interface StorageProps {
  driver: StorageDriver;
  bucket?: string;
  region?: string;
  endpoint?: string;
  credentials?: { accessKeyId: string; secretAccessKey: string };
  projectId?: string;
  keyFilename?: string;
  container?: string;
  connectionString?: string;
  children?: unknown;
}

export class Storage extends Provider {
  contextKey = STORAGE_KEY;
  private adapter: StorageAdapter;

  constructor(props: StorageProps) {
    super();
    switch (props.driver) {
      case "s3":
        this.adapter = createStorageAdapter("s3", {
          bucket: props.bucket!,
          region: props.region,
          endpoint: props.endpoint,
          credentials: props.credentials,
        });
        break;
      case "gcs":
        this.adapter = createStorageAdapter("gcs", {
          bucket: props.bucket!,
          projectId: props.projectId,
          keyFilename: props.keyFilename,
        });
        break;
      case "azure":
        this.adapter = createStorageAdapter("azure", {
          container: props.container!,
          connectionString: props.connectionString,
        });
        break;
      default:
        throw new Error(`Unsupported storage driver: ${props.driver}`);
    }
  }

  getContextValue(): StorageAdapter {
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

import type { StorageAdapter } from "./adapter.js";
import type { S3AdapterConfig } from "./adapters/s3.js";
import type { GCSAdapterConfig } from "./adapters/gcs.js";
import type { AzureBlobAdapterConfig } from "./adapters/azure.js";
export type StorageDriver = "s3" | "gcs" | "azure";
export declare function createStorageAdapter(driver: StorageDriver, config: S3AdapterConfig | GCSAdapterConfig | AzureBlobAdapterConfig): StorageAdapter;
//# sourceMappingURL=create-adapter.d.ts.map
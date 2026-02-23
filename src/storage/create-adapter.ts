import type { StorageAdapter } from "./adapter.js";
import type { S3AdapterConfig } from "./adapters/s3.js";
import { S3Adapter } from "./adapters/s3.js";
import type { GCSAdapterConfig } from "./adapters/gcs.js";
import { GCSAdapter } from "./adapters/gcs.js";
import type { AzureBlobAdapterConfig } from "./adapters/azure.js";
import { AzureBlobAdapter } from "./adapters/azure.js";

export type StorageDriver = "s3" | "gcs" | "azure";

export function createStorageAdapter(
  driver: StorageDriver,
  config: S3AdapterConfig | GCSAdapterConfig | AzureBlobAdapterConfig,
): StorageAdapter {
  switch (driver) {
    case "s3":
      return new S3Adapter(config as S3AdapterConfig);
    case "gcs":
      return new GCSAdapter(config as GCSAdapterConfig);
    case "azure":
      return new AzureBlobAdapter(config as AzureBlobAdapterConfig);
    default:
      throw new Error(`Unsupported storage driver: ${driver}`);
  }
}

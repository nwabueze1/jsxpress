import { S3Adapter } from "./adapters/s3.js";
import { GCSAdapter } from "./adapters/gcs.js";
import { AzureBlobAdapter } from "./adapters/azure.js";
export function createStorageAdapter(driver, config) {
    switch (driver) {
        case "s3":
            return new S3Adapter(config);
        case "gcs":
            return new GCSAdapter(config);
        case "azure":
            return new AzureBlobAdapter(config);
        default:
            throw new Error(`Unsupported storage driver: ${driver}`);
    }
}
//# sourceMappingURL=create-adapter.js.map
import type { StorageAdapter, PutOptions, StorageResult, StorageObject, UrlOptions } from "../adapter.js";
export interface AzureBlobAdapterConfig {
    container: string;
    connectionString?: string;
}
export declare class AzureBlobAdapter implements StorageAdapter {
    private containerClient;
    private serviceClient;
    private config;
    constructor(config: AzureBlobAdapterConfig);
    initialize(): Promise<void>;
    put(key: string, data: Blob | ReadableStream | Buffer, options?: PutOptions): Promise<StorageResult>;
    get(key: string): Promise<StorageObject | null>;
    delete(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
    getUrl(key: string, options?: UrlOptions): Promise<string>;
    close(): Promise<void>;
}
//# sourceMappingURL=azure.d.ts.map
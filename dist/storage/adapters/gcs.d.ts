import type { StorageAdapter, PutOptions, StorageResult, StorageObject, UrlOptions } from "../adapter.js";
export interface GCSAdapterConfig {
    bucket: string;
    projectId?: string;
    keyFilename?: string;
}
export declare class GCSAdapter implements StorageAdapter {
    private storage;
    private bucketRef;
    private config;
    constructor(config: GCSAdapterConfig);
    initialize(): Promise<void>;
    put(key: string, data: Blob | ReadableStream | Buffer, options?: PutOptions): Promise<StorageResult>;
    get(key: string): Promise<StorageObject | null>;
    delete(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
    getUrl(key: string, options?: UrlOptions): Promise<string>;
    close(): Promise<void>;
}
//# sourceMappingURL=gcs.d.ts.map
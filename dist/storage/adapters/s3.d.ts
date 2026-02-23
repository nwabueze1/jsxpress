import type { StorageAdapter, PutOptions, StorageResult, StorageObject, UrlOptions } from "../adapter.js";
export interface S3AdapterConfig {
    bucket: string;
    region?: string;
    endpoint?: string;
    credentials?: {
        accessKeyId: string;
        secretAccessKey: string;
    };
}
export declare class S3Adapter implements StorageAdapter {
    private client;
    private config;
    constructor(config: S3AdapterConfig);
    initialize(): Promise<void>;
    put(key: string, data: Blob | ReadableStream | Buffer, options?: PutOptions): Promise<StorageResult>;
    get(key: string): Promise<StorageObject | null>;
    delete(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
    getUrl(key: string, options?: UrlOptions): Promise<string>;
    close(): Promise<void>;
}
//# sourceMappingURL=s3.d.ts.map
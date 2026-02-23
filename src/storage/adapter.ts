export interface PutOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface StorageResult {
  key: string;
  url: string;
  size: number;
}

export interface StorageObject {
  key: string;
  body: ReadableStream;
  contentType: string;
  size: number;
}

export interface UrlOptions {
  expiresIn?: number;
}

export interface StorageAdapter {
  put(
    key: string,
    data: Blob | ReadableStream | Buffer,
    options?: PutOptions,
  ): Promise<StorageResult>;
  get(key: string): Promise<StorageObject | null>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getUrl(key: string, options?: UrlOptions): Promise<string>;
  initialize?(): Promise<void>;
  close?(): Promise<void>;
}

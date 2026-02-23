import type {
  StorageAdapter,
  PutOptions,
  StorageResult,
  StorageObject,
  UrlOptions,
} from "../adapter.js";

export interface GCSAdapterConfig {
  bucket: string;
  projectId?: string;
  keyFilename?: string;
}

export class GCSAdapter implements StorageAdapter {
  private storage: any = null;
  private bucketRef: any = null;
  private config: GCSAdapterConfig;

  constructor(config: GCSAdapterConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    const { Storage } = await import(/* @vite-ignore */ "@google-cloud/storage");
    this.storage = new Storage({
      ...(this.config.projectId && { projectId: this.config.projectId }),
      ...(this.config.keyFilename && { keyFilename: this.config.keyFilename }),
    });
    this.bucketRef = this.storage.bucket(this.config.bucket);
  }

  async put(
    key: string,
    data: Blob | ReadableStream | Buffer,
    options?: PutOptions,
  ): Promise<StorageResult> {
    let body: Buffer;
    if (data instanceof Blob) {
      body = Buffer.from(await data.arrayBuffer());
    } else if (data instanceof ReadableStream) {
      const chunks: Uint8Array[] = [];
      const reader = data.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      body = Buffer.concat(chunks);
    } else {
      body = data;
    }

    const file = this.bucketRef.file(key);
    await file.save(body, {
      contentType: options?.contentType,
      metadata: options?.metadata,
    });

    const url = `https://storage.googleapis.com/${this.config.bucket}/${key}`;
    return { key, url, size: body.length };
  }

  async get(key: string): Promise<StorageObject | null> {
    const { Readable } = await import("node:stream");
    const file = this.bucketRef.file(key);

    try {
      const [metadata] = await file.getMetadata();
      const nodeStream = file.createReadStream();
      const webStream = Readable.toWeb(nodeStream) as ReadableStream;

      return {
        key,
        body: webStream,
        contentType: metadata.contentType ?? "application/octet-stream",
        size: Number(metadata.size) ?? 0,
      };
    } catch (err: any) {
      if (err.code === 404) {
        return null;
      }
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    const file = this.bucketRef.file(key);
    await file.delete({ ignoreNotFound: true });
  }

  async exists(key: string): Promise<boolean> {
    const file = this.bucketRef.file(key);
    const [exists] = await file.exists();
    return exists;
  }

  async getUrl(key: string, options?: UrlOptions): Promise<string> {
    if (options?.expiresIn) {
      const file = this.bucketRef.file(key);
      const [url] = await file.getSignedUrl({
        action: "read" as const,
        expires: Date.now() + options.expiresIn * 1000,
      });
      return url;
    }

    return `https://storage.googleapis.com/${this.config.bucket}/${key}`;
  }

  async close(): Promise<void> {
    this.storage = null;
    this.bucketRef = null;
  }
}

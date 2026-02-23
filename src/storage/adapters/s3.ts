import type {
  StorageAdapter,
  PutOptions,
  StorageResult,
  StorageObject,
  UrlOptions,
} from "../adapter.js";

export interface S3AdapterConfig {
  bucket: string;
  region?: string;
  endpoint?: string;
  credentials?: { accessKeyId: string; secretAccessKey: string };
}

export class S3Adapter implements StorageAdapter {
  private client: any = null;
  private config: S3AdapterConfig;

  constructor(config: S3AdapterConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    const { S3Client } = await import(/* @vite-ignore */ "@aws-sdk/client-s3");
    this.client = new S3Client({
      region: this.config.region ?? "us-east-1",
      ...(this.config.endpoint && {
        endpoint: this.config.endpoint,
        forcePathStyle: true,
      }),
      ...(this.config.credentials && {
        credentials: this.config.credentials,
      }),
    });
  }

  async put(
    key: string,
    data: Blob | ReadableStream | Buffer,
    options?: PutOptions,
  ): Promise<StorageResult> {
    const { PutObjectCommand } = await import(
      /* @vite-ignore */ "@aws-sdk/client-s3"
    );

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

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: body,
        ContentType: options?.contentType,
        Metadata: options?.metadata,
      }),
    );

    const url = this.config.endpoint
      ? `${this.config.endpoint}/${this.config.bucket}/${key}`
      : `https://${this.config.bucket}.s3.${this.config.region ?? "us-east-1"}.amazonaws.com/${key}`;

    return { key, url, size: body.length };
  }

  async get(key: string): Promise<StorageObject | null> {
    const { GetObjectCommand } = await import(
      /* @vite-ignore */ "@aws-sdk/client-s3"
    );

    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
        }),
      );

      return {
        key,
        body: response.Body.transformToWebStream(),
        contentType: response.ContentType ?? "application/octet-stream",
        size: response.ContentLength ?? 0,
      };
    } catch (err: any) {
      if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    const { DeleteObjectCommand } = await import(
      /* @vite-ignore */ "@aws-sdk/client-s3"
    );

    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      }),
    );
  }

  async exists(key: string): Promise<boolean> {
    const { HeadObjectCommand } = await import(
      /* @vite-ignore */ "@aws-sdk/client-s3"
    );

    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
        }),
      );
      return true;
    } catch (err: any) {
      if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw err;
    }
  }

  async getUrl(key: string, options?: UrlOptions): Promise<string> {
    if (options?.expiresIn) {
      const { GetObjectCommand } = await import(
        /* @vite-ignore */ "@aws-sdk/client-s3"
      );
      const { getSignedUrl } = await import(
        /* @vite-ignore */ "@aws-sdk/s3-request-presigner"
      );

      return getSignedUrl(
        this.client,
        new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
        }),
        { expiresIn: options.expiresIn },
      );
    }

    if (this.config.endpoint) {
      return `${this.config.endpoint}/${this.config.bucket}/${key}`;
    }
    return `https://${this.config.bucket}.s3.${this.config.region ?? "us-east-1"}.amazonaws.com/${key}`;
  }

  async close(): Promise<void> {
    if (this.client) {
      this.client.destroy();
      this.client = null;
    }
  }
}

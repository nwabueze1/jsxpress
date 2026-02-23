import type {
  StorageAdapter,
  PutOptions,
  StorageResult,
  StorageObject,
  UrlOptions,
} from "../adapter.js";

export interface AzureBlobAdapterConfig {
  container: string;
  connectionString?: string;
}

export class AzureBlobAdapter implements StorageAdapter {
  private containerClient: any = null;
  private serviceClient: any = null;
  private config: AzureBlobAdapterConfig;

  constructor(config: AzureBlobAdapterConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    const { BlobServiceClient } = await import(
      /* @vite-ignore */ "@azure/storage-blob"
    );
    this.serviceClient = BlobServiceClient.fromConnectionString(
      this.config.connectionString ?? "",
    );
    this.containerClient = this.serviceClient.getContainerClient(
      this.config.container,
    );
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

    const blockBlobClient = this.containerClient.getBlockBlobClient(key);
    await blockBlobClient.upload(body, body.length, {
      blobHTTPHeaders: {
        blobContentType: options?.contentType,
      },
      metadata: options?.metadata,
    });

    return { key, url: blockBlobClient.url, size: body.length };
  }

  async get(key: string): Promise<StorageObject | null> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(key);

    try {
      const response = await blockBlobClient.download(0);
      const nodeStream = response.readableStreamBody;

      if (!nodeStream) {
        return null;
      }

      const { Readable } = await import("node:stream");
      const webStream = Readable.toWeb(nodeStream) as ReadableStream;

      return {
        key,
        body: webStream,
        contentType:
          response.contentType ?? "application/octet-stream",
        size: Number(response.contentLength) ?? 0,
      };
    } catch (err: any) {
      if (err.statusCode === 404) {
        return null;
      }
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(key);
    await blockBlobClient.deleteIfExists();
  }

  async exists(key: string): Promise<boolean> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(key);
    return blockBlobClient.exists();
  }

  async getUrl(key: string, options?: UrlOptions): Promise<string> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(key);

    if (options?.expiresIn) {
      const {
        generateBlobSASQueryParameters,
        BlobSASPermissions,
        StorageSharedKeyCredential,
      } = await import(/* @vite-ignore */ "@azure/storage-blob");

      const credential = this.serviceClient.credential;
      if (credential instanceof StorageSharedKeyCredential) {
        const sas = generateBlobSASQueryParameters(
          {
            containerName: this.config.container,
            blobName: key,
            permissions: BlobSASPermissions.parse("r"),
            expiresOn: new Date(Date.now() + options.expiresIn * 1000),
          },
          credential,
        );
        return `${blockBlobClient.url}?${sas}`;
      }
    }

    return blockBlobClient.url;
  }

  async close(): Promise<void> {
    this.containerClient = null;
    this.serviceClient = null;
  }
}

export class AzureBlobAdapter {
    containerClient = null;
    serviceClient = null;
    config;
    constructor(config) {
        this.config = config;
    }
    async initialize() {
        const { BlobServiceClient } = await import(
        /* @vite-ignore */ "@azure/storage-blob");
        this.serviceClient = BlobServiceClient.fromConnectionString(this.config.connectionString ?? "");
        this.containerClient = this.serviceClient.getContainerClient(this.config.container);
    }
    async put(key, data, options) {
        let body;
        if (data instanceof Blob) {
            body = Buffer.from(await data.arrayBuffer());
        }
        else if (data instanceof ReadableStream) {
            const chunks = [];
            const reader = data.getReader();
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                chunks.push(value);
            }
            body = Buffer.concat(chunks);
        }
        else {
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
    async get(key) {
        const blockBlobClient = this.containerClient.getBlockBlobClient(key);
        try {
            const response = await blockBlobClient.download(0);
            const nodeStream = response.readableStreamBody;
            if (!nodeStream) {
                return null;
            }
            const { Readable } = await import("node:stream");
            const webStream = Readable.toWeb(nodeStream);
            return {
                key,
                body: webStream,
                contentType: response.contentType ?? "application/octet-stream",
                size: Number(response.contentLength) ?? 0,
            };
        }
        catch (err) {
            if (err.statusCode === 404) {
                return null;
            }
            throw err;
        }
    }
    async delete(key) {
        const blockBlobClient = this.containerClient.getBlockBlobClient(key);
        await blockBlobClient.deleteIfExists();
    }
    async exists(key) {
        const blockBlobClient = this.containerClient.getBlockBlobClient(key);
        return blockBlobClient.exists();
    }
    async getUrl(key, options) {
        const blockBlobClient = this.containerClient.getBlockBlobClient(key);
        if (options?.expiresIn) {
            const { generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential, } = await import(/* @vite-ignore */ "@azure/storage-blob");
            const credential = this.serviceClient.credential;
            if (credential instanceof StorageSharedKeyCredential) {
                const sas = generateBlobSASQueryParameters({
                    containerName: this.config.container,
                    blobName: key,
                    permissions: BlobSASPermissions.parse("r"),
                    expiresOn: new Date(Date.now() + options.expiresIn * 1000),
                }, credential);
                return `${blockBlobClient.url}?${sas}`;
            }
        }
        return blockBlobClient.url;
    }
    async close() {
        this.containerClient = null;
        this.serviceClient = null;
    }
}
//# sourceMappingURL=azure.js.map
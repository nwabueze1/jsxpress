export class GCSAdapter {
    storage = null;
    bucketRef = null;
    config;
    constructor(config) {
        this.config = config;
    }
    async initialize() {
        const { Storage } = await import(/* @vite-ignore */ "@google-cloud/storage");
        this.storage = new Storage({
            ...(this.config.projectId && { projectId: this.config.projectId }),
            ...(this.config.keyFilename && { keyFilename: this.config.keyFilename }),
        });
        this.bucketRef = this.storage.bucket(this.config.bucket);
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
        const file = this.bucketRef.file(key);
        await file.save(body, {
            contentType: options?.contentType,
            metadata: options?.metadata,
        });
        const url = `https://storage.googleapis.com/${this.config.bucket}/${key}`;
        return { key, url, size: body.length };
    }
    async get(key) {
        const { Readable } = await import("node:stream");
        const file = this.bucketRef.file(key);
        try {
            const [metadata] = await file.getMetadata();
            const nodeStream = file.createReadStream();
            const webStream = Readable.toWeb(nodeStream);
            return {
                key,
                body: webStream,
                contentType: metadata.contentType ?? "application/octet-stream",
                size: Number(metadata.size) ?? 0,
            };
        }
        catch (err) {
            if (err.code === 404) {
                return null;
            }
            throw err;
        }
    }
    async delete(key) {
        const file = this.bucketRef.file(key);
        await file.delete({ ignoreNotFound: true });
    }
    async exists(key) {
        const file = this.bucketRef.file(key);
        const [exists] = await file.exists();
        return exists;
    }
    async getUrl(key, options) {
        if (options?.expiresIn) {
            const file = this.bucketRef.file(key);
            const [url] = await file.getSignedUrl({
                action: "read",
                expires: Date.now() + options.expiresIn * 1000,
            });
            return url;
        }
        return `https://storage.googleapis.com/${this.config.bucket}/${key}`;
    }
    async close() {
        this.storage = null;
        this.bucketRef = null;
    }
}
//# sourceMappingURL=gcs.js.map
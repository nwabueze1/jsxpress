export class S3Adapter {
    client = null;
    config;
    constructor(config) {
        this.config = config;
    }
    async initialize() {
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
    async put(key, data, options) {
        const { PutObjectCommand } = await import(
        /* @vite-ignore */ "@aws-sdk/client-s3");
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
        await this.client.send(new PutObjectCommand({
            Bucket: this.config.bucket,
            Key: key,
            Body: body,
            ContentType: options?.contentType,
            Metadata: options?.metadata,
        }));
        const url = this.config.endpoint
            ? `${this.config.endpoint}/${this.config.bucket}/${key}`
            : `https://${this.config.bucket}.s3.${this.config.region ?? "us-east-1"}.amazonaws.com/${key}`;
        return { key, url, size: body.length };
    }
    async get(key) {
        const { GetObjectCommand } = await import(
        /* @vite-ignore */ "@aws-sdk/client-s3");
        try {
            const response = await this.client.send(new GetObjectCommand({
                Bucket: this.config.bucket,
                Key: key,
            }));
            return {
                key,
                body: response.Body.transformToWebStream(),
                contentType: response.ContentType ?? "application/octet-stream",
                size: response.ContentLength ?? 0,
            };
        }
        catch (err) {
            if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
                return null;
            }
            throw err;
        }
    }
    async delete(key) {
        const { DeleteObjectCommand } = await import(
        /* @vite-ignore */ "@aws-sdk/client-s3");
        await this.client.send(new DeleteObjectCommand({
            Bucket: this.config.bucket,
            Key: key,
        }));
    }
    async exists(key) {
        const { HeadObjectCommand } = await import(
        /* @vite-ignore */ "@aws-sdk/client-s3");
        try {
            await this.client.send(new HeadObjectCommand({
                Bucket: this.config.bucket,
                Key: key,
            }));
            return true;
        }
        catch (err) {
            if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
                return false;
            }
            throw err;
        }
    }
    async getUrl(key, options) {
        if (options?.expiresIn) {
            const { GetObjectCommand } = await import(
            /* @vite-ignore */ "@aws-sdk/client-s3");
            const { getSignedUrl } = await import(
            /* @vite-ignore */ "@aws-sdk/s3-request-presigner");
            return getSignedUrl(this.client, new GetObjectCommand({
                Bucket: this.config.bucket,
                Key: key,
            }), { expiresIn: options.expiresIn });
        }
        if (this.config.endpoint) {
            return `${this.config.endpoint}/${this.config.bucket}/${key}`;
        }
        return `https://${this.config.bucket}.s3.${this.config.region ?? "us-east-1"}.amazonaws.com/${key}`;
    }
    async close() {
        if (this.client) {
            this.client.destroy();
            this.client = null;
        }
    }
}
//# sourceMappingURL=s3.js.map
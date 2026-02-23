declare module "@aws-sdk/client-s3" {
  export const S3Client: any;
  export const PutObjectCommand: any;
  export const GetObjectCommand: any;
  export const DeleteObjectCommand: any;
  export const HeadObjectCommand: any;
}

declare module "@aws-sdk/s3-request-presigner" {
  export function getSignedUrl(client: any, command: any, options?: any): Promise<string>;
}

declare module "@google-cloud/storage" {
  export const Storage: any;
}

declare module "@azure/storage-blob" {
  export const BlobServiceClient: any;
  export function generateBlobSASQueryParameters(options: any, credential: any): any;
  export const BlobSASPermissions: any;
  export const StorageSharedKeyCredential: any;
}

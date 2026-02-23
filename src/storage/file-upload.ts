import { Middleware } from "../components/Middleware.js";
import type { JsxpressRequest, NextFunction } from "../types.js";
import { parseFormData } from "./form-data.js";

export interface FileUploadProps {
  maxSize?: number;
  allowedTypes?: string[];
  maxFiles?: number;
  children?: unknown;
}

function matchesMimeType(fileType: string, pattern: string): boolean {
  if (pattern === fileType) return true;
  if (pattern.endsWith("/*")) {
    const prefix = pattern.slice(0, pattern.indexOf("/"));
    return fileType.startsWith(prefix + "/");
  }
  return false;
}

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB

export class FileUpload extends Middleware {
  private maxSize: number;
  private allowedTypes?: string[];
  private maxFiles?: number;

  constructor(props: FileUploadProps = {}) {
    super();
    this.maxSize = props.maxSize ?? DEFAULT_MAX_SIZE;
    this.allowedTypes = props.allowedTypes;
    this.maxFiles = props.maxFiles;
  }

  async handle(req: JsxpressRequest, next: NextFunction): Promise<Response> {
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.startsWith("multipart/form-data")) {
      return next();
    }

    const parsed = await parseFormData(req.raw);

    if (this.maxFiles !== undefined && parsed.files.length > this.maxFiles) {
      return Response.json(
        { error: `Too many files. Maximum allowed: ${this.maxFiles}` },
        { status: 413 },
      );
    }

    for (const file of parsed.files) {
      if (file.size > this.maxSize) {
        return Response.json(
          { error: `File "${file.fileName}" exceeds maximum size of ${this.maxSize} bytes` },
          { status: 413 },
        );
      }

      if (this.allowedTypes && this.allowedTypes.length > 0) {
        const allowed = this.allowedTypes.some((pattern) =>
          matchesMimeType(file.type, pattern),
        );
        if (!allowed) {
          return Response.json(
            { error: `File type "${file.type}" is not allowed` },
            { status: 415 },
          );
        }
      }
    }

    req.files = parsed.files;
    req.fields = parsed.fields;

    return next();
  }
}

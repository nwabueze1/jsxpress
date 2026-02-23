import { Middleware } from "../components/Middleware.js";
import type { JsxpressRequest, NextFunction } from "../types.js";
export interface FileUploadProps {
    maxSize?: number;
    allowedTypes?: string[];
    maxFiles?: number;
    children?: unknown;
}
export declare class FileUpload extends Middleware {
    private maxSize;
    private allowedTypes?;
    private maxFiles?;
    constructor(props?: FileUploadProps);
    handle(req: JsxpressRequest, next: NextFunction): Promise<Response>;
}
//# sourceMappingURL=file-upload.d.ts.map
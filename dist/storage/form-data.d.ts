export interface UploadedFile {
    fieldName: string;
    fileName: string;
    type: string;
    size: number;
    blob: Blob;
}
export interface ParsedFormData {
    fields: Record<string, string>;
    files: UploadedFile[];
}
export declare function parseFormData(raw: Request): Promise<ParsedFormData>;
//# sourceMappingURL=form-data.d.ts.map
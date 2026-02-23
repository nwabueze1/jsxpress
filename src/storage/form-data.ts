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

export async function parseFormData(raw: Request): Promise<ParsedFormData> {
  const formData = await raw.formData();
  const fields: Record<string, string> = {};
  const files: UploadedFile[] = [];

  for (const [name, value] of formData.entries()) {
    if (value instanceof File) {
      files.push({
        fieldName: name,
        fileName: value.name,
        type: value.type,
        size: value.size,
        blob: value,
      });
    } else {
      fields[name] = value;
    }
  }

  return { fields, files };
}

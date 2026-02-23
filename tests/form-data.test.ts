import { describe, it, expect } from "vitest";
import { parseFormData } from "../src/storage/form-data.js";

function createMultipartRequest(
  fields: Record<string, string | File>,
): Request {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return new Request("http://localhost/upload", {
    method: "POST",
    body: formData,
  });
}

describe("parseFormData", () => {
  it("parses text fields", async () => {
    const req = createMultipartRequest({
      name: "Alice",
      email: "alice@example.com",
    });

    const result = await parseFormData(req);
    expect(result.fields).toEqual({
      name: "Alice",
      email: "alice@example.com",
    });
    expect(result.files).toHaveLength(0);
  });

  it("parses a single file", async () => {
    const file = new File(["hello world"], "test.txt", {
      type: "text/plain",
    });
    const req = createMultipartRequest({ document: file });

    const result = await parseFormData(req);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].fieldName).toBe("document");
    expect(result.files[0].fileName).toBe("test.txt");
    expect(result.files[0].type).toBe("text/plain");
    expect(result.files[0].size).toBe(11);
    expect(result.files[0].blob).toBeInstanceOf(Blob);
    expect(result.fields).toEqual({});
  });

  it("parses mixed fields and files", async () => {
    const file = new File(["data"], "photo.png", { type: "image/png" });
    const req = createMultipartRequest({
      title: "My Photo",
      avatar: file,
    });

    const result = await parseFormData(req);
    expect(result.fields).toEqual({ title: "My Photo" });
    expect(result.files).toHaveLength(1);
    expect(result.files[0].fieldName).toBe("avatar");
    expect(result.files[0].fileName).toBe("photo.png");
    expect(result.files[0].type).toBe("image/png");
  });

  it("parses multiple files", async () => {
    const formData = new FormData();
    formData.append(
      "files",
      new File(["a"], "a.txt", { type: "text/plain" }),
    );
    formData.append(
      "files",
      new File(["b"], "b.txt", { type: "text/plain" }),
    );

    const req = new Request("http://localhost/upload", {
      method: "POST",
      body: formData,
    });

    const result = await parseFormData(req);
    expect(result.files).toHaveLength(2);
    expect(result.files[0].fileName).toBe("a.txt");
    expect(result.files[1].fileName).toBe("b.txt");
    expect(result.files[0].fieldName).toBe("files");
    expect(result.files[1].fieldName).toBe("files");
  });
});

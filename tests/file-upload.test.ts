import { describe, it, expect } from "vitest";
import { FileUpload } from "../src/storage/file-upload.js";
import type { JsxpressRequest, NextFunction } from "../src/types.js";
import { parseFormData } from "../src/storage/form-data.js";

function mockReq(
  body?: FormData,
  contentType?: string,
): JsxpressRequest {
  const init: RequestInit = { method: "POST" };
  if (body) init.body = body;
  const raw = new Request("http://localhost/upload", init);

  // Override content-type if explicitly set (for non-multipart tests)
  const headers = contentType
    ? new Headers({ "content-type": contentType })
    : raw.headers;

  return {
    raw,
    method: "POST",
    path: "/upload",
    params: {},
    query: new URLSearchParams(),
    headers,
    json: () => raw.json(),
    text: () => raw.text(),
    formData: () => parseFormData(raw),
  };
}

function successNext(): NextFunction {
  return async () => Response.json({ ok: true });
}

describe("FileUpload middleware", () => {
  it("passes through non-multipart requests", async () => {
    const mw = new FileUpload();
    const req = mockReq(undefined, "application/json");
    const res = await mw.handle(req, successNext());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(req.files).toBeUndefined();
  });

  it("populates req.files and req.fields on multipart", async () => {
    const mw = new FileUpload();

    const form = new FormData();
    form.append("name", "test");
    form.append(
      "file",
      new File(["hello"], "hello.txt", { type: "text/plain" }),
    );

    const req = mockReq(form);
    const res = await mw.handle(req, successNext());
    expect(res.status).toBe(200);
    expect(req.files).toHaveLength(1);
    expect(req.files![0].fileName).toBe("hello.txt");
    expect(req.fields).toEqual({ name: "test" });
  });

  it("returns 413 when file exceeds maxSize", async () => {
    const mw = new FileUpload({ maxSize: 5 });

    const form = new FormData();
    form.append(
      "file",
      new File(["too large content"], "big.txt", { type: "text/plain" }),
    );

    const req = mockReq(form);
    const res = await mw.handle(req, successNext());
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error).toContain("exceeds maximum size");
  });

  it("returns 415 when file type is not allowed", async () => {
    const mw = new FileUpload({ allowedTypes: ["image/*"] });

    const form = new FormData();
    form.append(
      "file",
      new File(["data"], "doc.pdf", { type: "application/pdf" }),
    );

    const req = mockReq(form);
    const res = await mw.handle(req, successNext());
    expect(res.status).toBe(415);
    const body = await res.json();
    expect(body.error).toContain("not allowed");
  });

  it("returns 413 when maxFiles is exceeded", async () => {
    const mw = new FileUpload({ maxFiles: 1 });

    const form = new FormData();
    form.append(
      "a",
      new File(["a"], "a.txt", { type: "text/plain" }),
    );
    form.append(
      "b",
      new File(["b"], "b.txt", { type: "text/plain" }),
    );

    const req = mockReq(form);
    const res = await mw.handle(req, successNext());
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error).toContain("Too many files");
  });

  it("allows files matching wildcard MIME type", async () => {
    const mw = new FileUpload({ allowedTypes: ["image/*"] });

    const form = new FormData();
    form.append(
      "photo",
      new File(["img"], "photo.png", { type: "image/png" }),
    );

    const req = mockReq(form);
    const res = await mw.handle(req, successNext());
    expect(res.status).toBe(200);
    expect(req.files).toHaveLength(1);
  });

  it("allows files matching exact MIME type", async () => {
    const mw = new FileUpload({ allowedTypes: ["application/pdf"] });

    const form = new FormData();
    form.append(
      "doc",
      new File(["pdf"], "doc.pdf", { type: "application/pdf" }),
    );

    const req = mockReq(form);
    const res = await mw.handle(req, successNext());
    expect(res.status).toBe(200);
    expect(req.files).toHaveLength(1);
  });

  it("allows zero-size files", async () => {
    const mw = new FileUpload({ maxSize: 100 });

    const form = new FormData();
    form.append(
      "empty",
      new File([], "empty.txt", { type: "text/plain" }),
    );

    const req = mockReq(form);
    const res = await mw.handle(req, successNext());
    expect(res.status).toBe(200);
    expect(req.files).toHaveLength(1);
    expect(req.files![0].size).toBe(0);
  });
});

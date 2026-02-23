import { describe, it, expect, afterEach } from "vitest";
import { jsx } from "../../src/jsx-runtime.js";
import { serve } from "../../src/index.js";
import { App } from "../../src/components/App.js";
import { Controller } from "../../src/components/Controller.js";
import { FileUpload } from "../../src/storage/file-upload.js";
import type { ServerHandle } from "../../src/server/types.js";
import type { JsxpressRequest } from "../../src/types.js";

class UploadHandler extends Controller {
  name = "upload";

  async post(req: JsxpressRequest) {
    return {
      fileCount: req.files?.length ?? 0,
      fileNames: req.files?.map((f) => f.fileName) ?? [],
      fields: req.fields ?? {},
    };
  }
}

class LazyFormDataHandler extends Controller {
  name = "lazy-upload";

  async post(req: JsxpressRequest) {
    const parsed = await req.formData();
    return {
      fileCount: parsed.files.length,
      fieldCount: Object.keys(parsed.fields).length,
    };
  }
}

let handle: ServerHandle | undefined;

afterEach(async () => {
  if (handle) {
    await handle.close();
    handle = undefined;
  }
});

describe("FileUpload integration", () => {
  it("parses multipart and populates req.files via middleware", async () => {
    const tree = jsx(App, {
      port: 0,
      children: jsx(FileUpload, {
        children: jsx(UploadHandler, {}),
      }),
    });
    handle = await serve(tree);

    const form = new FormData();
    form.append("title", "My Upload");
    form.append(
      "file",
      new File(["hello world"], "hello.txt", { type: "text/plain" }),
    );

    const res = await fetch(`http://localhost:${handle.port}/upload`, {
      method: "POST",
      body: form,
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.fileCount).toBe(1);
    expect(body.fileNames).toEqual(["hello.txt"]);
    expect(body.fields).toEqual({ title: "My Upload" });
  });

  it("returns 413 when file exceeds maxSize", async () => {
    const tree = jsx(App, {
      port: 0,
      children: jsx(FileUpload, {
        maxSize: 5,
        children: jsx(UploadHandler, {}),
      }),
    });
    handle = await serve(tree);

    const form = new FormData();
    form.append(
      "file",
      new File(["this is too large"], "big.txt", { type: "text/plain" }),
    );

    const res = await fetch(`http://localhost:${handle.port}/upload`, {
      method: "POST",
      body: form,
    });

    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error).toContain("exceeds maximum size");
  });

  it("returns 415 when file type is not allowed", async () => {
    const tree = jsx(App, {
      port: 0,
      children: jsx(FileUpload, {
        allowedTypes: ["image/*"],
        children: jsx(UploadHandler, {}),
      }),
    });
    handle = await serve(tree);

    const form = new FormData();
    form.append(
      "file",
      new File(["data"], "doc.pdf", { type: "application/pdf" }),
    );

    const res = await fetch(`http://localhost:${handle.port}/upload`, {
      method: "POST",
      body: form,
    });

    expect(res.status).toBe(415);
    const body = await res.json();
    expect(body.error).toContain("not allowed");
  });

  it("supports lazy req.formData() without middleware", async () => {
    const tree = jsx(App, {
      port: 0,
      children: jsx(LazyFormDataHandler, {}),
    });
    handle = await serve(tree);

    const form = new FormData();
    form.append("name", "test");
    form.append(
      "file",
      new File(["content"], "file.txt", { type: "text/plain" }),
    );

    const res = await fetch(`http://localhost:${handle.port}/lazy-upload`, {
      method: "POST",
      body: form,
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.fileCount).toBe(1);
    expect(body.fieldCount).toBe(1);
  });

  it("passes through non-multipart requests", async () => {
    class JsonHandler extends Controller {
      name = "json-endpoint";
      async post(req: JsxpressRequest) {
        const data = await req.json();
        return { received: data };
      }
    }

    const tree = jsx(App, {
      port: 0,
      children: jsx(FileUpload, {
        children: jsx(JsonHandler, {}),
      }),
    });
    handle = await serve(tree);

    const res = await fetch(`http://localhost:${handle.port}/json-endpoint`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ foo: "bar" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toEqual({ foo: "bar" });
  });
});

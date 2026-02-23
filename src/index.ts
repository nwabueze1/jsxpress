import type { JsxElement, JsxpressRequest, HttpMethod } from "./types.js";
import { App } from "./components/App.js";
import { compileTree } from "./tree.js";
import { Router } from "./router.js";
import { executeChain } from "./middleware.js";
import { createAdapter } from "./server/index.js";
import type { ServerHandle } from "./server/types.js";
import { parseFormData } from "./storage/form-data.js";

export { Controller } from "./components/Controller.js";
export { Middleware } from "./components/Middleware.js";
export { Provider } from "./components/Provider.js";
export { App } from "./components/App.js";
export { Res } from "./response.js";
export { Fragment } from "./jsx-runtime.js";
export { v, BaseSchema } from "./validation.js";
export type { ValidationError, MethodSchema, ControllerSchema } from "./validation.js";

// Config
export { Config, ConfigController, CONFIG_KEY, parseEnvFile, validateConfig } from "./config/index.js";
export type { ConfigProps } from "./config/index.js";

// Database
export { Database, Repository, Model, Field, DATABASE_KEY } from "./db/index.js";
export { QueryBuilder, MigrationRunner, hasMany, hasOne, belongsTo } from "./db/index.js";
export type { Dialect, DatabaseAdapter, QueryResult, DatabaseProps, Migration, MigrationRecord, RelationDefinition, OnDelete } from "./db/index.js";

// Storage
export { Storage, STORAGE_KEY, FileUpload, parseFormData, S3Adapter, GCSAdapter, AzureBlobAdapter } from "./storage/index.js";
export type {
  StorageAdapter, StorageProps, StorageDriver, StorageResult, StorageObject,
  PutOptions, UrlOptions, FileUploadProps, ParsedFormData, UploadedFile,
  S3AdapterConfig, GCSAdapterConfig, AzureBlobAdapterConfig,
} from "./storage/index.js";

export type { JsxpressRequest, HttpMethod, ServerHandle, NextFunction } from "./types.js";
export type { JsxElement } from "./types.js";

function createJsxpressRequest(raw: Request): JsxpressRequest {
  const url = new URL(raw.url);
  return {
    raw,
    method: raw.method.toUpperCase() as HttpMethod,
    path: url.pathname,
    params: {},
    query: url.searchParams,
    headers: raw.headers,
    json: () => raw.json(),
    text: () => raw.text(),
    formData: () => parseFormData(raw),
  };
}

function extractAppProps(tree: JsxElement): { port: number; hostname: string } {
  if (tree.type === App) {
    return {
      port: (tree.props.port as number) ?? 3000,
      hostname: (tree.props.hostname as string) ?? "0.0.0.0",
    };
  }
  return { port: 3000, hostname: "0.0.0.0" };
}

export async function serve(tree: JsxElement): Promise<ServerHandle> {
  const { port, hostname } = extractAppProps(tree);
  const { table, providers } = compileTree(tree);

  // Startup providers in order
  for (const p of providers) {
    if (p.startup) await p.startup();
  }

  const router = new Router(table);
  const adapter = await createAdapter();

  async function handler(raw: Request): Promise<Response> {
    const url = new URL(raw.url);
    const method = raw.method.toUpperCase() as HttpMethod;
    const route = router.match(url.pathname, method);

    if (!route) {
      return Response.json({ error: "Not Found" }, { status: 404 });
    }

    const req = createJsxpressRequest(raw);
    return executeChain(route.middlewareChain, route.handler, req);
  }

  const handle = await adapter.listen(handler, port, hostname);
  console.log(`jsxpress listening on ${handle.hostname}:${handle.port}`);

  // Wrap close to shutdown providers in reverse order
  const originalClose = handle.close.bind(handle);
  handle.close = async () => {
    await originalClose();
    for (const p of [...providers].reverse()) {
      if (p.shutdown) await p.shutdown();
    }
  };

  return handle;
}

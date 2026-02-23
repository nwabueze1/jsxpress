export const FragmentSymbol: unique symbol = Symbol.for("jsxpress.fragment");

export interface JsxElement {
  type: string | typeof FragmentSymbol | (new (props?: any) => any);
  props: Record<string, unknown> & { children?: JsxChild | JsxChild[] };
  key: string | null;
}

export type JsxChild = JsxElement | string | number | boolean | null | undefined;

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export const HTTP_METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];

export interface JsxpressRequest {
  raw: Request;
  method: HttpMethod;
  path: string;
  params: Record<string, string>;
  query: URLSearchParams;
  headers: Headers;
  body?: unknown;
  files?: import("./storage/form-data.js").UploadedFile[];
  fields?: Record<string, string>;
  json(): Promise<unknown>;
  text(): Promise<string>;
  formData(): Promise<import("./storage/form-data.js").ParsedFormData>;
}

export type NextFunction = () => Promise<Response>;

export type RouteHandler = (req: JsxpressRequest) => unknown | Promise<unknown>;

export type MiddlewareHandler = (
  req: JsxpressRequest,
  next: NextFunction
) => Response | Promise<Response>;

export interface Route {
  path: string;
  method: HttpMethod;
  handler: RouteHandler;
  middlewareChain: MiddlewareHandler[];
}

export type RouteTable = Map<string, Map<HttpMethod, Route>>;

export interface AppProps {
  port?: number;
  hostname?: string;
  children?: JsxChild | JsxChild[];
}

export interface ServerHandle {
  port: number;
  hostname: string;
  close(): void | Promise<void>;
}

export interface ServerAdapter {
  listen(
    handler: (req: Request) => Promise<Response>,
    port: number,
    hostname: string
  ): Promise<ServerHandle>;
}

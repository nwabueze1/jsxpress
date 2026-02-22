import type {
  JsxElement,
  JsxChild,
  HttpMethod,
  JsxpressRequest,
  MiddlewareHandler,
  RouteTable,
} from "./types.js";
import { validateRequest } from "./validation.js";
import type { MethodSchema } from "./validation.js";
import { FragmentSymbol, HTTP_METHODS } from "./types.js";
import { App } from "./components/App.js";
import { Controller } from "./components/Controller.js";
import { Middleware } from "./components/Middleware.js";
import { Provider } from "./components/Provider.js";

interface CompileContext {
  pathSegments: string[];
  middlewareStack: MiddlewareHandler[];
  contextValues: Map<symbol, unknown>;
}

export interface CompileResult {
  table: RouteTable;
  providers: Provider[];
}

function normalizeChildren(children: JsxChild | JsxChild[] | undefined): JsxElement[] {
  if (children === undefined || children === null) return [];
  const arr = Array.isArray(children) ? children : [children];
  return arr.filter(
    (c): c is JsxElement =>
      c !== null && c !== undefined && typeof c === "object" && "type" in c
  );
}

function buildPath(segments: string[]): string {
  const joined = "/" + segments.filter(Boolean).join("/");
  return joined || "/";
}

function isControllerClass(type: unknown): type is new (props?: any) => Controller {
  return typeof type === "function" && type.prototype instanceof Controller;
}

function isMiddlewareClass(type: unknown): type is new (props?: any) => Middleware {
  return typeof type === "function" && type.prototype instanceof Middleware;
}

function isAppClass(type: unknown): type is new (props?: any) => App {
  return type === App;
}

function isProviderClass(type: unknown): type is new (props?: any) => Provider {
  return typeof type === "function" && type.prototype instanceof Provider;
}

function walkNode(
  node: JsxElement,
  ctx: CompileContext,
  table: RouteTable,
  providers: Provider[]
): void {
  const { type, props } = node;

  if (type === FragmentSymbol) {
    for (const child of normalizeChildren(props.children)) {
      walkNode(child, ctx, table, providers);
    }
    return;
  }

  if (isAppClass(type)) {
    for (const child of normalizeChildren(props.children)) {
      walkNode(child, ctx, table, providers);
    }
    return;
  }

  if (isProviderClass(type)) {
    const instance = new type(props);
    providers.push(instance);

    const newContextValues = new Map(ctx.contextValues);
    newContextValues.set(instance.contextKey, instance.getContextValue());

    const newCtx: CompileContext = { ...ctx, contextValues: newContextValues };
    for (const child of normalizeChildren(props.children)) {
      walkNode(child, newCtx, table, providers);
    }
    return;
  }

  if (isMiddlewareClass(type)) {
    const instance = new type(props);
    const newStack = [...ctx.middlewareStack, instance.handle.bind(instance)];
    const newCtx: CompileContext = { ...ctx, middlewareStack: newStack };
    for (const child of normalizeChildren(props.children)) {
      walkNode(child, newCtx, table, providers);
    }
    return;
  }

  if (isControllerClass(type)) {
    const instance = new type(props);
    const name = instance.name;

    // Inject context values into the controller
    instance.__context = new Map(ctx.contextValues);

    // Support absolute paths (starting with "/") or relative segment appending
    let pathSegments: string[];
    if (name.startsWith("/")) {
      pathSegments = name.split("/").filter(Boolean);
    } else {
      pathSegments = [...ctx.pathSegments, name];
    }

    const path = buildPath(pathSegments);

    for (const method of HTTP_METHODS) {
      const handlerKey = method.toLowerCase() as Lowercase<HttpMethod>;
      const rawHandler = (instance as any)[handlerKey];
      if (typeof rawHandler === "function") {
        const boundHandler = rawHandler.bind(instance);
        const methodSchema: MethodSchema | undefined =
          instance.schema?.[handlerKey];

        let handler;
        if (methodSchema) {
          handler = async (req: JsxpressRequest) => {
            const result = await validateRequest(req, methodSchema);
            if ("errors" in result) {
              return Response.json(
                { errors: result.errors },
                { status: 422 }
              );
            }
            if ("body" in result && result.body !== undefined) {
              req.body = result.body;
              req.json = async () => result.body;
            }
            return boundHandler(req);
          };
        } else {
          handler = boundHandler;
        }

        if (!table.has(path)) table.set(path, new Map());
        table.get(path)!.set(method, {
          path,
          method,
          handler,
          middlewareChain: [...ctx.middlewareStack],
        });
      }
    }

    // Controllers can have children (nested resources)
    const children = normalizeChildren(props.children);
    if (children.length > 0) {
      const childCtx: CompileContext = {
        ...ctx,
        pathSegments,
      };
      for (const child of children) {
        walkNode(child, childCtx, table, providers);
      }
    }
    return;
  }
}

export function compileTree(root: JsxElement): CompileResult {
  const table: RouteTable = new Map();
  const providers: Provider[] = [];
  walkNode(
    root,
    { pathSegments: [], middlewareStack: [], contextValues: new Map() },
    table,
    providers
  );
  return { table, providers };
}

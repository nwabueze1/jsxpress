import { validateRequest } from "./validation.js";
import { FragmentSymbol, HTTP_METHODS } from "./types.js";
import { App } from "./components/App.js";
import { Controller } from "./components/Controller.js";
import { Middleware } from "./components/Middleware.js";
import { Provider } from "./components/Provider.js";
function normalizeChildren(children) {
    if (children === undefined || children === null)
        return [];
    const arr = Array.isArray(children) ? children : [children];
    return arr.filter((c) => c !== null && c !== undefined && typeof c === "object" && "type" in c);
}
function buildPath(segments) {
    const joined = "/" + segments.filter(Boolean).join("/");
    return joined || "/";
}
function isControllerClass(type) {
    return typeof type === "function" && type.prototype instanceof Controller;
}
function isMiddlewareClass(type) {
    return typeof type === "function" && type.prototype instanceof Middleware;
}
function isAppClass(type) {
    return type === App;
}
function isProviderClass(type) {
    return typeof type === "function" && type.prototype instanceof Provider;
}
function walkNode(node, ctx, table, providers) {
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
        const newCtx = { ...ctx, contextValues: newContextValues };
        for (const child of normalizeChildren(props.children)) {
            walkNode(child, newCtx, table, providers);
        }
        return;
    }
    if (isMiddlewareClass(type)) {
        const instance = new type(props);
        const newStack = [...ctx.middlewareStack, instance.handle.bind(instance)];
        const newCtx = { ...ctx, middlewareStack: newStack };
        for (const child of normalizeChildren(props.children)) {
            walkNode(child, newCtx, table, providers);
        }
        return;
    }
    if (isControllerClass(type)) {
        const instance = new type(props);
        const routePath = (typeof props.path === "string") ? props.path : instance.name;
        // Inject context values into the controller
        instance.__context = new Map(ctx.contextValues);
        // Support absolute paths (starting with "/") or relative segment appending
        let pathSegments;
        if (routePath.startsWith("/")) {
            pathSegments = routePath.split("/").filter(Boolean);
        }
        else {
            pathSegments = [...ctx.pathSegments, routePath];
        }
        const path = buildPath(pathSegments);
        for (const method of HTTP_METHODS) {
            const handlerKey = method.toLowerCase();
            const rawHandler = instance[handlerKey];
            if (typeof rawHandler === "function") {
                const boundHandler = rawHandler.bind(instance);
                const methodSchema = instance.schema?.[handlerKey];
                let handler;
                if (methodSchema) {
                    handler = async (req) => {
                        const result = await validateRequest(req, methodSchema);
                        if ("errors" in result) {
                            return Response.json({ errors: result.errors }, { status: 422 });
                        }
                        if ("body" in result && result.body !== undefined) {
                            req.body = result.body;
                            req.json = async () => result.body;
                        }
                        return boundHandler(req);
                    };
                }
                else {
                    handler = boundHandler;
                }
                if (!table.has(path))
                    table.set(path, new Map());
                table.get(path).set(method, {
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
            const childCtx = {
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
export function compileTree(root) {
    const table = new Map();
    const providers = [];
    walkNode(root, { pathSegments: [], middlewareStack: [], contextValues: new Map() }, table, providers);
    return { table, providers };
}
//# sourceMappingURL=tree.js.map
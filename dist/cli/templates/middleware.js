function toPascalCase(s) {
    return s.replace(/(^|[-_ ])(\w)/g, (_, __, c) => c.toUpperCase());
}
export function middlewareTemplate(name) {
    const className = toPascalCase(name);
    return `import { Middleware, type JsxpressRequest, type NextFunction } from "jsxserve";

export class ${className} extends Middleware {
  async handle(req: JsxpressRequest, next: NextFunction): Promise<Response> {
    return next();
  }
}
`;
}
//# sourceMappingURL=middleware.js.map
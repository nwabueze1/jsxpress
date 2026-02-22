function toPascalCase(s: string): string {
  return s.replace(/(^|[-_ ])(\w)/g, (_, __, c) => c.toUpperCase());
}

export function middlewareTemplate(name: string): string {
  const className = toPascalCase(name);
  return `import { Middleware, type JsxpressRequest, type NextFunction } from "jsxpress";

export class ${className} extends Middleware {
  async handle(req: JsxpressRequest, next: NextFunction): Promise<Response> {
    return next();
  }
}
`;
}

function toPascalCase(s: string): string {
  return s.replace(/(^|[-_ ])(\w)/g, (_, __, c) => c.toUpperCase());
}

export function controllerTemplate(name: string): string {
  const className = toPascalCase(name);
  return `import { Controller, type JsxpressRequest } from "jsxserve";
import { Res } from "jsxserve";

export class ${className} extends Controller {
  name = "${name}";

  get(req: JsxpressRequest) {
    return Res.json({ message: "GET /${name}" });
  }
}
`;
}

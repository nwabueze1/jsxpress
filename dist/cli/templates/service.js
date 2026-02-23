function toPascalCase(s) {
    return s.replace(/(^|[-_ ])(\w)/g, (_, __, c) => c.toUpperCase());
}
export function serviceTemplate(name) {
    const className = toPascalCase(name);
    return `import { Service } from "jsxserve";

export class ${className}Service extends Service {
  // Add your business logic methods here
}
`;
}
//# sourceMappingURL=service.js.map
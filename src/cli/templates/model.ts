function toPascalCase(s: string): string {
  return s.replace(/(^|[-_ ])(\w)/g, (_, __, c) => c.toUpperCase());
}

export function modelTemplate(
  name: string,
  fields: { name: string; type: string }[],
): string {
  const className = toPascalCase(name);
  const tableName = name.toLowerCase() + "s";

  const fieldLines = fields
    .map((f) => `    ${f.name}: Field.${f.type}().notNull(),`)
    .join("\n");

  return `import { Model, Field } from "jsxpress";

export class ${className} extends Model {
  static table = "${tableName}";

  static schema = {
    id: Field.serial().primaryKey(),
${fieldLines}
  };
}
`;
}

export function migrationTemplate() {
    return `import type { DatabaseAdapter } from "jsxpress";

export async function up(adapter: DatabaseAdapter): Promise<void> {
  await adapter.raw("");
}

export async function down(adapter: DatabaseAdapter): Promise<void> {
  await adapter.raw("");
}
`;
}
//# sourceMappingURL=migration.js.map
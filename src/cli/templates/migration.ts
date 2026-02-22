export function migrationTemplate(): string {
  return `import type { DatabaseAdapter } from "jsxserve";

export async function up(adapter: DatabaseAdapter): Promise<void> {
  await adapter.raw("");
}

export async function down(adapter: DatabaseAdapter): Promise<void> {
  await adapter.raw("");
}
`;
}

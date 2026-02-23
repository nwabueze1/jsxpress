export function migrationTemplate(): string {
  return `import type { Schema } from "jsxserve";

export async function up(schema: Schema): Promise<void> {
  // schema.create("table_name", (table) => {
  //   table.serial("id").primaryKey();
  //   table.text("name").notNull();
  //   table.timestamps();
  // });
}

export async function down(schema: Schema): Promise<void> {
  // schema.dropIfExists("table_name");
}
`;
}

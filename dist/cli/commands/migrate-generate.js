import { join } from "node:path";
import { writeFile, mkdir } from "node:fs/promises";
import { migrationTemplate } from "../templates/migration.js";
import { nextMigrationNumber, pad } from "../utils/migration.js";
const green = (s) => `\x1b[32m${s}\x1b[0m`;
export async function migrateGenerate(options = {}) {
    const migrationsDir = join(process.cwd(), "migrations");
    await mkdir(migrationsDir, { recursive: true });
    const num = await nextMigrationNumber(migrationsDir);
    const migrationName = options.name ?? "migration";
    const fileName = `${pad(num, 3)}_${migrationName}.ts`;
    const filePath = join(migrationsDir, fileName);
    await writeFile(filePath, migrationTemplate(), "utf-8");
    console.log(green(`Migration created: migrations/${fileName}`));
}
//# sourceMappingURL=migrate-generate.js.map
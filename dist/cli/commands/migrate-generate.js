import { join } from "node:path";
import { writeFile, mkdir } from "node:fs/promises";
import { createDatabaseAdapter } from "../../db/create-adapter.js";
import { discoverModels } from "../../db/model-discovery.js";
import { resolveModelSchema } from "../../db/schema-diff.js";
import { introspectTable, listTables } from "../../db/introspect.js";
import { diffSchema } from "../../db/schema-diff.js";
import { generateMigrationSQL, generateMigrationFile } from "../../db/migration-generator.js";
import { nextMigrationNumber, pad } from "../utils/migration.js";
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
export async function migrateGenerate(options = {}) {
    const dialect = process.env.DB_DIALECT;
    const url = process.env.DB_URL;
    if (!dialect || !url) {
        console.log(red("Missing DB_DIALECT or DB_URL environment variables."));
        return;
    }
    if (dialect === "mongodb") {
        console.log(red("Migration generation is not supported for MongoDB."));
        return;
    }
    const sqlDialect = dialect;
    const adapter = createDatabaseAdapter(dialect, url);
    try {
        await adapter.connect();
        // Discover models
        const modelsDir = options.modelsDir ?? join(process.cwd(), "src", "models");
        let models;
        try {
            models = await discoverModels(modelsDir);
        }
        catch (err) {
            console.log(red(err.message));
            return;
        }
        if (models.length === 0) {
            console.log(yellow("No models found in src/models/."));
            return;
        }
        // Resolve model schemas
        const modelInfos = models.map((m) => ({
            table: m.table,
            schema: resolveModelSchema(m),
        }));
        // Introspect DB
        const tableNames = await listTables(adapter, sqlDialect);
        const dbTables = new Map();
        for (const name of tableNames) {
            const columns = await introspectTable(adapter, name, sqlDialect);
            if (columns) {
                dbTables.set(name, columns);
            }
        }
        // Diff
        const operations = diffSchema(modelInfos, dbTables, sqlDialect);
        if (operations.length === 0) {
            console.log(green("No schema changes detected."));
            return;
        }
        // Print summary
        console.log(`\nDetected ${operations.length} change(s):\n`);
        for (const op of operations) {
            switch (op.type) {
                case "create_table":
                    console.log(`  + CREATE TABLE ${op.table}`);
                    break;
                case "add_column":
                    console.log(`  + ADD COLUMN ${op.table}.${op.column}`);
                    break;
                case "drop_column":
                    console.log(`  - DROP COLUMN ${op.table}.${op.column}`);
                    break;
                case "alter_column":
                    console.log(`  ~ ALTER COLUMN ${op.table}.${op.column} (${op.from.type} → ${op.to.type})`);
                    break;
                case "drop_table":
                    console.log(`  - DROP TABLE ${op.table}`);
                    break;
            }
        }
        // Generate migration
        const { up, down } = generateMigrationSQL(operations, sqlDialect);
        const fileContent = generateMigrationFile(up, down);
        const migrationsDir = join(process.cwd(), "migrations");
        await mkdir(migrationsDir, { recursive: true });
        const num = await nextMigrationNumber(migrationsDir);
        const migrationName = options.name ?? "auto_migration";
        const fileName = `${pad(num, 3)}_${migrationName}.ts`;
        const filePath = join(migrationsDir, fileName);
        await writeFile(filePath, fileContent, "utf-8");
        console.log(`\n${green(`Migration created: migrations/${fileName}`)}`);
    }
    finally {
        await adapter.close();
    }
}
//# sourceMappingURL=migrate-generate.js.map
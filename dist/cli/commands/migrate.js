import { join } from "node:path";
import { createDatabaseAdapter } from "../../db/create-adapter.js";
import { MigrationRunner } from "../../db/migration.js";
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
export async function migrate(subcommand) {
    const dialect = process.env.DB_DIALECT;
    const url = process.env.DB_URL;
    if (!dialect || !url) {
        console.log(red("Missing DB_DIALECT or DB_URL environment variables."));
        return;
    }
    const adapter = createDatabaseAdapter(dialect, url);
    try {
        await adapter.connect();
        const runner = new MigrationRunner(adapter, join(process.cwd(), "migrations"));
        switch (subcommand) {
            case "up": {
                const before = await runner.applied();
                await runner.up();
                const after = await runner.applied();
                const applied = after.size - before.size;
                console.log(green(`Applied ${applied} migration(s).`));
                break;
            }
            case "down": {
                await runner.down();
                console.log(green("Rolled back 1 migration."));
                break;
            }
            case "status": {
                const pending = await runner.pending();
                if (pending.length === 0) {
                    console.log(green("All migrations are up to date."));
                }
                else {
                    console.log(`Pending migrations (${pending.length}):`);
                    for (const m of pending) {
                        console.log(`  ${m.id} - ${m.name}`);
                    }
                }
                break;
            }
            default:
                console.log(red(`Unknown migrate subcommand: ${subcommand}`));
                console.log("Valid subcommands: up, down, status");
        }
    }
    finally {
        await adapter.close();
    }
}
//# sourceMappingURL=migrate.js.map
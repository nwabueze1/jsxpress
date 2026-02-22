import { Provider } from "../components/Provider.js";
import { createDatabaseAdapter } from "./create-adapter.js";
export const DATABASE_KEY = Symbol.for("jsxpress.database");
export class Database extends Provider {
    contextKey = DATABASE_KEY;
    adapter;
    models;
    migrationsPath;
    constructor(props) {
        super();
        this.adapter = createDatabaseAdapter(props.dialect, props.url);
        this.models = props.models ?? [];
        this.migrationsPath = props.migrationsPath;
        if (props.dialect === "mongodb" && props.migrationsPath) {
            throw new Error("Migrations are not supported for MongoDB. Use models with syncTable() instead.");
        }
    }
    getContextValue() {
        return this.adapter;
    }
    async startup() {
        await this.adapter.connect();
        if (this.migrationsPath) {
            const { MigrationRunner } = await import("./migration.js");
            const runner = new MigrationRunner(this.adapter, this.migrationsPath);
            await runner.up();
        }
        else {
            for (const m of this.models) {
                await m.syncTable(this.adapter);
            }
        }
    }
    async shutdown() {
        await this.adapter.close();
    }
}
//# sourceMappingURL=database.js.map
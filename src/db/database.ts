import { Provider } from "../components/Provider.js";
import type { Dialect, DatabaseAdapter } from "./adapter.js";
import { createDatabaseAdapter } from "./create-adapter.js";
import type { Model } from "./model.js";

export const DATABASE_KEY: unique symbol = Symbol.for("jsxpress.database");

export interface DatabaseProps {
  dialect: Dialect;
  url: string;
  models?: (typeof Model)[];
  migrationsPath?: string;
  children?: unknown;
}

export class Database extends Provider {
  contextKey = DATABASE_KEY;
  private adapter: DatabaseAdapter;
  private models: (typeof Model)[];
  private migrationsPath?: string;

  constructor(props: DatabaseProps) {
    super();
    this.adapter = createDatabaseAdapter(props.dialect, props.url);
    this.models = props.models ?? [];
    this.migrationsPath = props.migrationsPath;

    if (props.dialect === "mongodb" && props.migrationsPath) {
      throw new Error(
        "Migrations are not supported for MongoDB. Use models with syncTable() instead.",
      );
    }
  }

  getContextValue(): DatabaseAdapter {
    return this.adapter;
  }

  async startup(): Promise<void> {
    await this.adapter.connect();
    if (this.migrationsPath) {
      const { MigrationRunner } = await import("./migration.js");
      const runner = new MigrationRunner(this.adapter, this.migrationsPath);
      await runner.up();
    } else {
      for (const m of this.models) {
        await m.syncTable(this.adapter);
      }
    }
  }

  async shutdown(): Promise<void> {
    await this.adapter.close();
  }
}

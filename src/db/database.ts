import { Provider } from "../components/Provider.js";
import type { Dialect, DatabaseAdapter } from "./adapter.js";
import { createDatabaseAdapter } from "./create-adapter.js";

export const DATABASE_KEY: unique symbol = Symbol.for("jsxpress.database");

export interface DatabaseProps {
  dialect: Dialect;
  url: string;
  migrationsPath?: string;
  children?: unknown;
}

export class Database extends Provider {
  contextKey = DATABASE_KEY;
  private adapter: DatabaseAdapter;
  private migrationsPath?: string;

  constructor(props: DatabaseProps) {
    super();
    this.adapter = createDatabaseAdapter(props.dialect, props.url);
    this.migrationsPath = props.migrationsPath;

    if (props.dialect === "mongodb" && props.migrationsPath) {
      throw new Error(
        "Migrations are not supported for MongoDB.",
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
    }
  }

  async shutdown(): Promise<void> {
    await this.adapter.close();
  }
}

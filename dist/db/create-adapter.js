import { SqliteAdapter } from "./adapters/sqlite.js";
import { PostgresAdapter } from "./adapters/postgres.js";
import { MysqlAdapter } from "./adapters/mysql.js";
import { MongodbAdapter } from "./adapters/mongodb.js";
export function createDatabaseAdapter(dialect, url) {
    switch (dialect) {
        case "sqlite":
            return new SqliteAdapter(url);
        case "postgres":
            return new PostgresAdapter(url);
        case "mysql":
            return new MysqlAdapter(url);
        case "mongodb":
            return new MongodbAdapter(url);
        default:
            throw new Error(`Unsupported dialect: ${dialect}`);
    }
}
//# sourceMappingURL=create-adapter.js.map
import { Provider } from "../components/Provider.js";
import type { Dialect, DatabaseAdapter } from "./adapter.js";
export declare const DATABASE_KEY: unique symbol;
export interface DatabaseProps {
    dialect: Dialect;
    url: string;
    migrationsPath?: string;
    children?: unknown;
}
export declare class Database extends Provider {
    contextKey: symbol;
    private adapter;
    private migrationsPath?;
    constructor(props: DatabaseProps);
    getContextValue(): DatabaseAdapter;
    startup(): Promise<void>;
    shutdown(): Promise<void>;
}
//# sourceMappingURL=database.d.ts.map
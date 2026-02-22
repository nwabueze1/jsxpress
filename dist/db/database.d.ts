import { Provider } from "../components/Provider.js";
import type { Dialect, DatabaseAdapter } from "./adapter.js";
import type { Model } from "./model.js";
export declare const DATABASE_KEY: unique symbol;
export interface DatabaseProps {
    dialect: Dialect;
    url: string;
    models?: (typeof Model)[];
    migrationsPath?: string;
    children?: unknown;
}
export declare class Database extends Provider {
    contextKey: symbol;
    private adapter;
    private models;
    private migrationsPath?;
    constructor(props: DatabaseProps);
    getContextValue(): DatabaseAdapter;
    startup(): Promise<void>;
    shutdown(): Promise<void>;
}
//# sourceMappingURL=database.d.ts.map
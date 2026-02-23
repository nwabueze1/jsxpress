import { Provider } from "../components/Provider.js";
import type { StorageAdapter } from "./adapter.js";
import type { StorageDriver } from "./create-adapter.js";
export declare const STORAGE_KEY: unique symbol;
export interface StorageProps {
    driver: StorageDriver;
    bucket?: string;
    region?: string;
    endpoint?: string;
    credentials?: {
        accessKeyId: string;
        secretAccessKey: string;
    };
    projectId?: string;
    keyFilename?: string;
    container?: string;
    connectionString?: string;
    children?: unknown;
}
export declare class Storage extends Provider {
    contextKey: symbol;
    private adapter;
    constructor(props: StorageProps);
    getContextValue(): StorageAdapter;
    startup(): Promise<void>;
    shutdown(): Promise<void>;
}
//# sourceMappingURL=storage.d.ts.map
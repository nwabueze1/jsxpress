import { Provider } from "../components/Provider.js";
import { BaseSchema } from "../validation.js";
export declare const CONFIG_KEY: unique symbol;
export interface ConfigProps {
    schema: Record<string, BaseSchema>;
    env?: string;
    values?: Record<string, unknown>;
    children?: unknown;
}
export declare function parseEnvFile(filePath: string): Record<string, string>;
export declare function validateConfig(values: Record<string, unknown>, schema: Record<string, BaseSchema>): Record<string, unknown>;
export declare class Config extends Provider {
    contextKey: symbol;
    private frozen;
    constructor(props: ConfigProps);
    getContextValue(): Record<string, unknown>;
}
//# sourceMappingURL=config.d.ts.map
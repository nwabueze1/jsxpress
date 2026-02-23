import type { DatabaseAdapter } from "./adapter.js";
import { Schema } from "./schema.js";
export interface Migration {
    up(schema: Schema): Promise<void> | void;
    down?(schema: Schema): Promise<void> | void;
}
export interface MigrationRecord {
    id: number;
    name: string;
    filename: string;
}
export declare class MigrationRunner {
    private adapter;
    private migrationsPath;
    constructor(adapter: DatabaseAdapter, migrationsPath: string);
    ensureTable(): Promise<void>;
    discover(): Promise<MigrationRecord[]>;
    applied(): Promise<Set<number>>;
    pending(): Promise<MigrationRecord[]>;
    up(): Promise<void>;
    down(): Promise<void>;
    downAll(): Promise<void>;
    downTo(targetId: number): Promise<void>;
}
//# sourceMappingURL=migration.d.ts.map
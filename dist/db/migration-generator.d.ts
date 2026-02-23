import type { DiffOperation } from "./schema-diff.js";
import type { SqlDialect } from "./sql.js";
export declare function generateMigrationSQL(operations: DiffOperation[], dialect: SqlDialect): {
    up: string[];
    down: string[];
};
export declare function generateMigrationFile(upStatements: string[], downStatements: string[]): string;
//# sourceMappingURL=migration-generator.d.ts.map
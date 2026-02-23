import { buildColumnDef, buildCreateTableFromDefs, quoteIdent, fieldTypeToSql } from "./sql.js";
export function generateMigrationSQL(operations, dialect) {
    const up = [];
    const down = [];
    for (const op of operations) {
        switch (op.type) {
            case "create_table": {
                up.push(buildCreateTableFromDefs(op.table, op.columns, dialect));
                down.push(`DROP TABLE IF EXISTS ${quoteIdent(op.table, dialect)}`);
                break;
            }
            case "add_column": {
                const colDef = buildColumnDef(op.column, op.definition, dialect);
                up.push(`ALTER TABLE ${quoteIdent(op.table, dialect)} ADD COLUMN ${colDef}`);
                down.push(`ALTER TABLE ${quoteIdent(op.table, dialect)} DROP COLUMN ${quoteIdent(op.column, dialect)}`);
                break;
            }
            case "drop_column": {
                if (dialect === "sqlite") {
                    up.push(`-- WARNING: DROP COLUMN requires SQLite 3.35.0+`);
                }
                up.push(`ALTER TABLE ${quoteIdent(op.table, dialect)} DROP COLUMN ${quoteIdent(op.column, dialect)}`);
                down.push(`-- TODO: reverse of DROP COLUMN "${op.column}" on "${op.table}"`);
                break;
            }
            case "alter_column": {
                const newType = fieldTypeToSql(op.to.type, dialect);
                if (dialect === "sqlite") {
                    up.push(`-- WARNING: SQLite does not support ALTER COLUMN. Manual table recreation required for "${op.table}"."${op.column}"`);
                    down.push(`-- WARNING: SQLite does not support ALTER COLUMN. Manual table recreation required for "${op.table}"."${op.column}"`);
                }
                else if (dialect === "postgres") {
                    up.push(`ALTER TABLE ${quoteIdent(op.table, dialect)} ALTER COLUMN ${quoteIdent(op.column, dialect)} TYPE ${newType}`);
                    down.push(`ALTER TABLE ${quoteIdent(op.table, dialect)} ALTER COLUMN ${quoteIdent(op.column, dialect)} TYPE ${op.from.type}`);
                }
                else {
                    // MySQL
                    const colDef = buildColumnDef(op.column, op.to, dialect);
                    up.push(`ALTER TABLE ${quoteIdent(op.table, dialect)} MODIFY COLUMN ${colDef}`);
                    down.push(`ALTER TABLE ${quoteIdent(op.table, dialect)} MODIFY COLUMN ${quoteIdent(op.column, dialect)} ${op.from.type}`);
                }
                break;
            }
            case "drop_table": {
                up.push(`DROP TABLE IF EXISTS ${quoteIdent(op.table, dialect)}`);
                down.push(`-- TODO: recreate table "${op.table}"`);
                break;
            }
        }
    }
    return { up, down };
}
function escapeTemplateLiteral(s) {
    return s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");
}
export function generateMigrationFile(upStatements, downStatements) {
    const upBody = upStatements
        .map((s) => s.startsWith("--") ? `  ${s}` : `  schema.raw(\`${escapeTemplateLiteral(s)}\`);`)
        .join("\n");
    const downBody = downStatements
        .map((s) => s.startsWith("--") ? `  ${s}` : `  schema.raw(\`${escapeTemplateLiteral(s)}\`);`)
        .join("\n");
    return `import type { Schema } from "jsxserve";

export async function up(schema: Schema): Promise<void> {
${upBody}
}

export async function down(schema: Schema): Promise<void> {
${downBody}
}
`;
}
//# sourceMappingURL=migration-generator.js.map
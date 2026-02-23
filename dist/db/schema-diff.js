import { fieldTypeToSql } from "./sql.js";
import { Field } from "./field.js";
export function resolveModelSchema(model) {
    const resolved = {};
    for (const [name, builder] of Object.entries(model.schema)) {
        resolved[name] = builder.toDefinition();
    }
    if (model.timestamps) {
        resolved.created_at = Field.timestamp().notNull().toDefinition();
        resolved.updated_at = Field.timestamp().notNull().toDefinition();
    }
    if (model.softDelete) {
        resolved.deleted_at = Field.timestamp().toDefinition();
    }
    return resolved;
}
function normalizeType(type) {
    return type.toUpperCase().replace(/\(.*\)/, "").trim();
}
export function typesMatch(modelType, dbType, dialect) {
    const expectedSql = fieldTypeToSql(modelType, dialect);
    const normalizedExpected = normalizeType(expectedSql);
    const normalizedDb = normalizeType(dbType);
    if (normalizedExpected === normalizedDb)
        return true;
    // serial is syntactic sugar — maps to INTEGER in all dialects
    if (modelType === "serial") {
        if (normalizedDb === "INTEGER" || normalizedDb === "INT")
            return true;
        // Postgres reports serial as integer in information_schema
        if (dialect === "postgres" && normalizedDb === "INTEGER")
            return true;
    }
    // MySQL: INT and INTEGER are the same
    if (dialect === "mysql") {
        if (normalizedExpected === "INT" && normalizedDb === "INTEGER")
            return true;
        if (normalizedExpected === "INTEGER" && normalizedDb === "INT")
            return true;
    }
    return false;
}
export function diffSchema(models, dbTables, dialect) {
    const operations = [];
    const modelTableNames = new Set(models.map((m) => m.table));
    for (const model of models) {
        const dbColumns = dbTables.get(model.table);
        if (!dbColumns) {
            // Table doesn't exist in DB — create it
            operations.push({ type: "create_table", table: model.table, columns: model.schema });
            continue;
        }
        const dbColumnMap = new Map(dbColumns.map((c) => [c.name, c]));
        const modelColumnNames = new Set(Object.keys(model.schema));
        // Check for new or changed columns
        for (const [colName, colDef] of Object.entries(model.schema)) {
            const dbCol = dbColumnMap.get(colName);
            if (!dbCol) {
                operations.push({ type: "add_column", table: model.table, column: colName, definition: colDef });
            }
            else if (!typesMatch(colDef.type, dbCol.type, dialect)) {
                operations.push({ type: "alter_column", table: model.table, column: colName, from: dbCol, to: colDef });
            }
        }
        // Check for dropped columns
        for (const dbCol of dbColumns) {
            if (!modelColumnNames.has(dbCol.name)) {
                operations.push({ type: "drop_column", table: model.table, column: dbCol.name });
            }
        }
    }
    // Check for tables in DB that have no model
    for (const tableName of dbTables.keys()) {
        if (!modelTableNames.has(tableName)) {
            operations.push({ type: "drop_table", table: tableName });
        }
    }
    return operations;
}
//# sourceMappingURL=schema-diff.js.map
export async function introspectTable(adapter, tableName, dialect) {
    switch (dialect) {
        case "sqlite": {
            const result = await adapter.raw(`PRAGMA table_info("${tableName}")`);
            if (result.rows.length === 0)
                return null;
            return result.rows.map((row) => ({
                name: row.name,
                type: row.type.toUpperCase(),
                notNull: row.notnull === 1,
                defaultValue: row.dflt_value,
                primaryKey: row.pk === 1,
            }));
        }
        case "postgres": {
            const colResult = await adapter.raw(`SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = $1`, [tableName]);
            if (colResult.rows.length === 0)
                return null;
            const pkResult = await adapter.raw(`SELECT a.attname FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey) WHERE i.indrelid = $1::regclass AND i.indisprimary`, [tableName]);
            const pkColumns = new Set(pkResult.rows.map((r) => r.attname));
            return colResult.rows.map((row) => ({
                name: row.column_name,
                type: row.data_type.toUpperCase(),
                notNull: row.is_nullable === "NO",
                defaultValue: row.column_default,
                primaryKey: pkColumns.has(row.column_name),
            }));
        }
        case "mysql": {
            const result = await adapter.raw(`SELECT column_name, column_type, is_nullable, column_default, column_key FROM information_schema.columns WHERE table_name = ? AND table_schema = DATABASE()`, [tableName]);
            if (result.rows.length === 0)
                return null;
            return result.rows.map((row) => ({
                name: row.column_name,
                type: row.column_type.toUpperCase(),
                notNull: row.is_nullable === "NO",
                defaultValue: row.column_default,
                primaryKey: row.column_key === "PRI",
            }));
        }
    }
}
export async function listTables(adapter, dialect) {
    switch (dialect) {
        case "sqlite": {
            const result = await adapter.raw(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '\\_%' ESCAPE '\\'`);
            return result.rows.map((r) => r.name);
        }
        case "postgres": {
            const result = await adapter.raw(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name NOT LIKE '\\_%'`);
            return result.rows.map((r) => r.table_name);
        }
        case "mysql": {
            const result = await adapter.raw(`SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name NOT LIKE '\\_%'`);
            return result.rows.map((r) => r.table_name);
        }
    }
}
//# sourceMappingURL=introspect.js.map
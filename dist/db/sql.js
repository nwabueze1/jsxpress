const TYPE_MAP = {
    sqlite: {
        serial: "INTEGER",
        text: "TEXT",
        integer: "INTEGER",
        boolean: "INTEGER",
        timestamp: "TEXT",
        json: "TEXT",
        real: "REAL",
        uuid: "TEXT",
    },
    postgres: {
        serial: "SERIAL",
        text: "TEXT",
        integer: "INTEGER",
        boolean: "BOOLEAN",
        timestamp: "TIMESTAMPTZ",
        json: "JSONB",
        real: "DOUBLE PRECISION",
        uuid: "UUID",
    },
    mysql: {
        serial: "INT AUTO_INCREMENT",
        text: "TEXT",
        integer: "INT",
        boolean: "TINYINT(1)",
        timestamp: "DATETIME",
        json: "JSON",
        real: "DOUBLE",
        uuid: "CHAR(36)",
    },
};
export function fieldTypeToSql(type, dialect) {
    return TYPE_MAP[dialect][type];
}
export function quoteIdent(name, dialect) {
    if (dialect === "mysql")
        return `\`${name}\``;
    return `"${name}"`;
}
export function placeholder(index, dialect) {
    if (dialect === "postgres")
        return `$${index}`;
    return "?";
}
export function buildColumnDef(name, def, dialect) {
    const parts = [quoteIdent(name, dialect), fieldTypeToSql(def.type, dialect)];
    if (def.primaryKey) {
        if (dialect === "sqlite" && def.type === "serial") {
            // SQLite: INTEGER PRIMARY KEY is auto-incrementing
            parts[1] = "INTEGER";
        }
        parts.push("PRIMARY KEY");
    }
    if (def.notNull && !def.primaryKey) {
        parts.push("NOT NULL");
    }
    if (def.unique) {
        parts.push("UNIQUE");
    }
    if (def.defaultValue !== undefined) {
        const val = typeof def.defaultValue === "string"
            ? `'${def.defaultValue}'`
            : String(def.defaultValue);
        parts.push(`DEFAULT ${val}`);
    }
    if (def.referencesTable) {
        const refCol = def.referencesColumn ?? "id";
        parts.push(`REFERENCES ${quoteIdent(def.referencesTable, dialect)}(${quoteIdent(refCol, dialect)})`);
        if (def.onDelete) {
            parts.push(`ON DELETE ${def.onDelete.toUpperCase()}`);
        }
    }
    return parts.join(" ");
}
export function buildCreateTable(tableName, schema, dialect) {
    const defs = {};
    for (const [name, builder] of Object.entries(schema)) {
        defs[name] = builder.toDefinition();
    }
    return buildCreateTableFromDefs(tableName, defs, dialect);
}
export function buildCreateTableFromDefs(tableName, schema, dialect) {
    const cols = [];
    for (const [name, def] of Object.entries(schema)) {
        cols.push(buildColumnDef(name, def, dialect));
    }
    const quotedTable = quoteIdent(tableName, dialect);
    return `CREATE TABLE IF NOT EXISTS ${quotedTable} (${cols.join(", ")})`;
}
//# sourceMappingURL=sql.js.map
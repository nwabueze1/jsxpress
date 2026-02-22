const TYPE_MAP = {
    sqlite: {
        serial: "INTEGER",
        text: "TEXT",
        integer: "INTEGER",
        boolean: "INTEGER",
        timestamp: "TEXT",
        json: "TEXT",
        real: "REAL",
    },
    postgres: {
        serial: "SERIAL",
        text: "TEXT",
        integer: "INTEGER",
        boolean: "BOOLEAN",
        timestamp: "TIMESTAMPTZ",
        json: "JSONB",
        real: "DOUBLE PRECISION",
    },
    mysql: {
        serial: "INT AUTO_INCREMENT",
        text: "TEXT",
        integer: "INT",
        boolean: "TINYINT(1)",
        timestamp: "DATETIME",
        json: "JSON",
        real: "DOUBLE",
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
export function buildCreateTable(tableName, schema, dialect) {
    const cols = [];
    for (const [name, builder] of Object.entries(schema)) {
        const def = builder.toDefinition();
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
        cols.push(parts.join(" "));
    }
    const quotedTable = quoteIdent(tableName, dialect);
    return `CREATE TABLE IF NOT EXISTS ${quotedTable} (${cols.join(", ")})`;
}
//# sourceMappingURL=sql.js.map
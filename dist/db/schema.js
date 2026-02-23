import { FieldBuilder } from "./field.js";
import { buildCreateTableFromDefs, buildColumnDef, quoteIdent } from "./sql.js";
export class Blueprint {
    /** @internal */
    columns = [];
    /** @internal */
    uniqueConstraints = [];
    serial(name) {
        const b = new FieldBuilder("serial");
        this.columns.push({ kind: "add", name, builder: b });
        return b;
    }
    text(name) {
        const b = new FieldBuilder("text");
        this.columns.push({ kind: "add", name, builder: b });
        return b;
    }
    integer(name) {
        const b = new FieldBuilder("integer");
        this.columns.push({ kind: "add", name, builder: b });
        return b;
    }
    boolean(name) {
        const b = new FieldBuilder("boolean");
        this.columns.push({ kind: "add", name, builder: b });
        return b;
    }
    timestamp(name) {
        const b = new FieldBuilder("timestamp");
        this.columns.push({ kind: "add", name, builder: b });
        return b;
    }
    json(name) {
        const b = new FieldBuilder("json");
        this.columns.push({ kind: "add", name, builder: b });
        return b;
    }
    real(name) {
        const b = new FieldBuilder("real");
        this.columns.push({ kind: "add", name, builder: b });
        return b;
    }
    uuid(name) {
        const b = new FieldBuilder("uuid");
        this.columns.push({ kind: "add", name, builder: b });
        return b;
    }
    timestamps() {
        this.timestamp("created_at").notNull();
        this.timestamp("updated_at").notNull();
    }
    softDeletes() {
        this.timestamp("deleted_at");
    }
    dropColumn(name) {
        this.columns.push({ kind: "drop", name });
    }
    renameColumn(from, to) {
        this.columns.push({ kind: "rename", from, to });
    }
    unique(columns) {
        this.uniqueConstraints.push({ columns });
    }
}
export class Schema {
    /** @internal */
    operations = [];
    adapter;
    constructor(adapter) {
        this.adapter = adapter;
    }
    create(table, callback) {
        const bp = new Blueprint();
        callback(bp);
        this.operations.push({ kind: "create", table, blueprint: bp });
    }
    table(table, callback) {
        const bp = new Blueprint();
        callback(bp);
        this.operations.push({ kind: "alter", table, blueprint: bp });
    }
    drop(table) {
        this.operations.push({ kind: "drop", table, ifExists: false });
    }
    dropIfExists(table) {
        this.operations.push({ kind: "drop", table, ifExists: true });
    }
    rename(from, to) {
        this.operations.push({ kind: "rename", from, to });
    }
    raw(sql, params) {
        this.operations.push({ kind: "raw", sql, params });
    }
    async execute() {
        const dialect = this.adapter.dialect;
        for (const op of this.operations) {
            switch (op.kind) {
                case "create": {
                    const defs = {};
                    for (const col of op.blueprint.columns) {
                        if (col.kind === "add") {
                            defs[col.name] = col.builder.toDefinition();
                        }
                    }
                    let sql = buildCreateTableFromDefs(op.table, defs, dialect);
                    if (op.blueprint.uniqueConstraints.length > 0) {
                        // Inject unique constraints before the closing paren
                        const constraints = op.blueprint.uniqueConstraints.map((uc) => `UNIQUE(${uc.columns.map((c) => quoteIdent(c, dialect)).join(", ")})`);
                        sql = sql.replace(/\)$/, `, ${constraints.join(", ")})`);
                    }
                    await this.adapter.raw(sql);
                    break;
                }
                case "alter": {
                    for (const col of op.blueprint.columns) {
                        switch (col.kind) {
                            case "add": {
                                const colDef = buildColumnDef(col.name, col.builder.toDefinition(), dialect);
                                await this.adapter.raw(`ALTER TABLE ${quoteIdent(op.table, dialect)} ADD COLUMN ${colDef}`);
                                break;
                            }
                            case "drop": {
                                await this.adapter.raw(`ALTER TABLE ${quoteIdent(op.table, dialect)} DROP COLUMN ${quoteIdent(col.name, dialect)}`);
                                break;
                            }
                            case "rename": {
                                await this.adapter.raw(`ALTER TABLE ${quoteIdent(op.table, dialect)} RENAME COLUMN ${quoteIdent(col.from, dialect)} TO ${quoteIdent(col.to, dialect)}`);
                                break;
                            }
                        }
                    }
                    for (const uc of op.blueprint.uniqueConstraints) {
                        const cols = uc.columns.map((c) => quoteIdent(c, dialect)).join(", ");
                        const name = `uq_${op.table}_${uc.columns.join("_")}`;
                        await this.adapter.raw(`CREATE UNIQUE INDEX ${quoteIdent(name, dialect)} ON ${quoteIdent(op.table, dialect)} (${cols})`);
                    }
                    break;
                }
                case "drop": {
                    const keyword = op.ifExists ? "DROP TABLE IF EXISTS" : "DROP TABLE";
                    await this.adapter.raw(`${keyword} ${quoteIdent(op.table, dialect)}`);
                    break;
                }
                case "rename": {
                    await this.adapter.raw(`ALTER TABLE ${quoteIdent(op.from, dialect)} RENAME TO ${quoteIdent(op.to, dialect)}`);
                    break;
                }
                case "raw": {
                    await this.adapter.raw(op.sql, op.params);
                    break;
                }
            }
        }
    }
}
//# sourceMappingURL=schema.js.map
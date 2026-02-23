import type { DatabaseAdapter } from "./adapter.js";
import type { SqlDialect } from "./sql.js";
import { FieldBuilder } from "./field.js";
import type { FieldDefinition } from "./field.js";
import { buildCreateTableFromDefs, buildColumnDef, quoteIdent } from "./sql.js";

type ColumnOp =
  | { kind: "add"; name: string; builder: FieldBuilder }
  | { kind: "drop"; name: string }
  | { kind: "rename"; from: string; to: string };

interface UniqueConstraint {
  columns: string[];
}

export class Blueprint {
  /** @internal */
  readonly columns: ColumnOp[] = [];
  /** @internal */
  readonly uniqueConstraints: UniqueConstraint[] = [];

  serial(name: string): FieldBuilder {
    const b = new FieldBuilder("serial");
    this.columns.push({ kind: "add", name, builder: b });
    return b;
  }

  text(name: string): FieldBuilder {
    const b = new FieldBuilder("text");
    this.columns.push({ kind: "add", name, builder: b });
    return b;
  }

  integer(name: string): FieldBuilder {
    const b = new FieldBuilder("integer");
    this.columns.push({ kind: "add", name, builder: b });
    return b;
  }

  boolean(name: string): FieldBuilder {
    const b = new FieldBuilder("boolean");
    this.columns.push({ kind: "add", name, builder: b });
    return b;
  }

  timestamp(name: string): FieldBuilder {
    const b = new FieldBuilder("timestamp");
    this.columns.push({ kind: "add", name, builder: b });
    return b;
  }

  json(name: string): FieldBuilder {
    const b = new FieldBuilder("json");
    this.columns.push({ kind: "add", name, builder: b });
    return b;
  }

  real(name: string): FieldBuilder {
    const b = new FieldBuilder("real");
    this.columns.push({ kind: "add", name, builder: b });
    return b;
  }

  uuid(name: string): FieldBuilder {
    const b = new FieldBuilder("uuid");
    this.columns.push({ kind: "add", name, builder: b });
    return b;
  }

  timestamps(): void {
    this.timestamp("created_at").notNull();
    this.timestamp("updated_at").notNull();
  }

  softDeletes(): void {
    this.timestamp("deleted_at");
  }

  dropColumn(name: string): void {
    this.columns.push({ kind: "drop", name });
  }

  renameColumn(from: string, to: string): void {
    this.columns.push({ kind: "rename", from, to });
  }

  unique(columns: string[]): void {
    this.uniqueConstraints.push({ columns });
  }
}

type SchemaOp =
  | { kind: "create"; table: string; blueprint: Blueprint }
  | { kind: "alter"; table: string; blueprint: Blueprint }
  | { kind: "drop"; table: string; ifExists: boolean }
  | { kind: "rename"; from: string; to: string }
  | { kind: "raw"; sql: string; params?: unknown[] };

export class Schema {
  /** @internal */
  readonly operations: SchemaOp[] = [];

  private adapter: DatabaseAdapter;

  constructor(adapter: DatabaseAdapter) {
    this.adapter = adapter;
  }

  create(table: string, callback: (table: Blueprint) => void): void {
    const bp = new Blueprint();
    callback(bp);
    this.operations.push({ kind: "create", table, blueprint: bp });
  }

  table(table: string, callback: (table: Blueprint) => void): void {
    const bp = new Blueprint();
    callback(bp);
    this.operations.push({ kind: "alter", table, blueprint: bp });
  }

  drop(table: string): void {
    this.operations.push({ kind: "drop", table, ifExists: false });
  }

  dropIfExists(table: string): void {
    this.operations.push({ kind: "drop", table, ifExists: true });
  }

  rename(from: string, to: string): void {
    this.operations.push({ kind: "rename", from, to });
  }

  raw(sql: string, params?: unknown[]): void {
    this.operations.push({ kind: "raw", sql, params });
  }

  async execute(): Promise<void> {
    const dialect = this.adapter.dialect as SqlDialect;

    for (const op of this.operations) {
      switch (op.kind) {
        case "create": {
          const defs: Record<string, FieldDefinition> = {};
          for (const col of op.blueprint.columns) {
            if (col.kind === "add") {
              defs[col.name] = col.builder.toDefinition();
            }
          }

          let sql = buildCreateTableFromDefs(op.table, defs, dialect);

          if (op.blueprint.uniqueConstraints.length > 0) {
            // Inject unique constraints before the closing paren
            const constraints = op.blueprint.uniqueConstraints.map(
              (uc) => `UNIQUE(${uc.columns.map((c) => quoteIdent(c, dialect)).join(", ")})`,
            );
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
                await this.adapter.raw(
                  `ALTER TABLE ${quoteIdent(op.table, dialect)} ADD COLUMN ${colDef}`,
                );
                break;
              }
              case "drop": {
                await this.adapter.raw(
                  `ALTER TABLE ${quoteIdent(op.table, dialect)} DROP COLUMN ${quoteIdent(col.name, dialect)}`,
                );
                break;
              }
              case "rename": {
                await this.adapter.raw(
                  `ALTER TABLE ${quoteIdent(op.table, dialect)} RENAME COLUMN ${quoteIdent(col.from, dialect)} TO ${quoteIdent(col.to, dialect)}`,
                );
                break;
              }
            }
          }

          for (const uc of op.blueprint.uniqueConstraints) {
            const cols = uc.columns.map((c) => quoteIdent(c, dialect)).join(", ");
            const name = `uq_${op.table}_${uc.columns.join("_")}`;
            await this.adapter.raw(
              `CREATE UNIQUE INDEX ${quoteIdent(name, dialect)} ON ${quoteIdent(op.table, dialect)} (${cols})`,
            );
          }
          break;
        }

        case "drop": {
          const keyword = op.ifExists ? "DROP TABLE IF EXISTS" : "DROP TABLE";
          await this.adapter.raw(`${keyword} ${quoteIdent(op.table, dialect)}`);
          break;
        }

        case "rename": {
          await this.adapter.raw(
            `ALTER TABLE ${quoteIdent(op.from, dialect)} RENAME TO ${quoteIdent(op.to, dialect)}`,
          );
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

import { readdir } from "node:fs/promises";
import { join } from "node:path";
import type { DatabaseAdapter } from "./adapter.js";
import { Schema } from "./schema.js";
import { quoteIdent, placeholder } from "./sql.js";

export interface Migration {
  up(schema: Schema): Promise<void> | void;
  down?(schema: Schema): Promise<void> | void;
}

export interface MigrationRecord {
  id: number;
  name: string;
  filename: string;
}

const MIGRATION_PATTERN = /^(\d+)[_-](.+)\.(ts|js|mjs)$/;

export class MigrationRunner {
  constructor(
    private adapter: DatabaseAdapter,
    private migrationsPath: string,
  ) {}

  async ensureTable(): Promise<void> {
    const d = this.adapter.dialect;
    const table = quoteIdent("_migrations", d);
    const id = quoteIdent("id", d);
    const name = quoteIdent("name", d);
    const appliedAt = quoteIdent("applied_at", d);

    await this.adapter.raw(
      `CREATE TABLE IF NOT EXISTS ${table} (${id} INTEGER PRIMARY KEY, ${name} TEXT NOT NULL, ${appliedAt} TEXT NOT NULL)`,
    );
  }

  async discover(): Promise<MigrationRecord[]> {
    const entries = await readdir(this.migrationsPath);
    const migrations: MigrationRecord[] = [];

    for (const filename of entries) {
      const match = filename.match(MIGRATION_PATTERN);
      if (!match) continue;
      migrations.push({
        id: Number(match[1]),
        name: match[2],
        filename,
      });
    }

    migrations.sort((a, b) => a.id - b.id);
    return migrations;
  }

  async applied(): Promise<Set<number>> {
    await this.ensureTable();
    const d = this.adapter.dialect;
    const table = quoteIdent("_migrations", d);
    const id = quoteIdent("id", d);
    const result = await this.adapter.raw(
      `SELECT ${id} FROM ${table}`,
    );
    return new Set(result.rows.map((r: Record<string, unknown>) => Number(r.id)));
  }

  async pending(): Promise<MigrationRecord[]> {
    const all = await this.discover();
    const done = await this.applied();
    return all.filter((m) => !done.has(m.id));
  }

  async up(): Promise<void> {
    await this.ensureTable();
    const todo = await this.pending();

    for (const record of todo) {
      const filePath = join(this.migrationsPath, record.filename);
      const mod: Migration = await import(filePath);
      const schema = new Schema(this.adapter);
      await mod.up(schema);
      await schema.execute();

      const d = this.adapter.dialect;
      const table = quoteIdent("_migrations", d);
      const id = quoteIdent("id", d);
      const name = quoteIdent("name", d);
      const appliedAt = quoteIdent("applied_at", d);
      const p1 = placeholder(1, d);
      const p2 = placeholder(2, d);
      const p3 = placeholder(3, d);

      await this.adapter.raw(
        `INSERT INTO ${table} (${id}, ${name}, ${appliedAt}) VALUES (${p1}, ${p2}, ${p3})`,
        [record.id, record.name, new Date().toISOString()],
      );
    }
  }

  async down(): Promise<void> {
    await this.ensureTable();
    const done = await this.applied();
    if (done.size === 0) return;

    const all = await this.discover();
    const appliedMigrations = all
      .filter((m) => done.has(m.id))
      .sort((a, b) => b.id - a.id);

    const latest = appliedMigrations[0];
    if (!latest) return;

    const filePath = join(this.migrationsPath, latest.filename);
    const mod: Migration = await import(filePath);

    if (!mod.down) {
      throw new Error(
        `Migration ${latest.filename} does not export a down() function`,
      );
    }

    const schema = new Schema(this.adapter);
    await mod.down(schema);
    await schema.execute();

    const d = this.adapter.dialect;
    const table = quoteIdent("_migrations", d);
    const id = quoteIdent("id", d);
    const p1 = placeholder(1, d);

    await this.adapter.raw(
      `DELETE FROM ${table} WHERE ${id} = ${p1}`,
      [latest.id],
    );
  }

  async downAll(): Promise<void> {
    let done = await this.applied();
    while (done.size > 0) {
      await this.down();
      done = await this.applied();
    }
  }

  async downTo(targetId: number): Promise<void> {
    let done = await this.applied();
    const idsAbove = [...done].filter((id) => id > targetId).sort((a, b) => b - a);

    for (const _ of idsAbove) {
      await this.down();
    }
  }
}

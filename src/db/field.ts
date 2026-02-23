export type FieldType = "serial" | "text" | "integer" | "boolean" | "timestamp" | "json" | "real" | "uuid";

export interface FieldDefinition {
  type: FieldType;
  primaryKey: boolean;
  notNull: boolean;
  unique: boolean;
  defaultValue?: unknown;
  referencesTable?: string;
  referencesColumn?: string;
  onDelete?: string;
}

export class FieldBuilder {
  private def: FieldDefinition;

  constructor(type: FieldType) {
    this.def = {
      type,
      primaryKey: false,
      notNull: false,
      unique: false,
    };
  }

  primaryKey(): this {
    this.def.primaryKey = true;
    this.def.notNull = true;
    return this;
  }

  notNull(): this {
    this.def.notNull = true;
    return this;
  }

  unique(): this {
    this.def.unique = true;
    return this;
  }

  default(value: unknown): this {
    this.def.defaultValue = value;
    return this;
  }

  references(
    target: { table: string },
    options?: { column?: string; onDelete?: string },
  ): this {
    this.def.referencesTable = target.table;
    this.def.referencesColumn = options?.column ?? "id";
    this.def.onDelete = options?.onDelete;
    return this;
  }

  /** @internal */
  toDefinition(): FieldDefinition {
    return { ...this.def };
  }
}

export const Field = {
  serial(): FieldBuilder {
    return new FieldBuilder("serial");
  },
  text(): FieldBuilder {
    return new FieldBuilder("text");
  },
  integer(): FieldBuilder {
    return new FieldBuilder("integer");
  },
  boolean(): FieldBuilder {
    return new FieldBuilder("boolean");
  },
  timestamp(): FieldBuilder {
    return new FieldBuilder("timestamp");
  },
  json(): FieldBuilder {
    return new FieldBuilder("json");
  },
  real(): FieldBuilder {
    return new FieldBuilder("real");
  },
  uuid(): FieldBuilder {
    return new FieldBuilder("uuid");
  },
};

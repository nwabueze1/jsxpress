export class FieldBuilder {
    def;
    constructor(type) {
        this.def = {
            type,
            primaryKey: false,
            notNull: false,
            unique: false,
        };
    }
    primaryKey() {
        this.def.primaryKey = true;
        this.def.notNull = true;
        return this;
    }
    notNull() {
        this.def.notNull = true;
        return this;
    }
    unique() {
        this.def.unique = true;
        return this;
    }
    default(value) {
        this.def.defaultValue = value;
        return this;
    }
    references(target, options) {
        this.def.referencesTable = target.table;
        this.def.referencesColumn = options?.column ?? "id";
        this.def.onDelete = options?.onDelete;
        return this;
    }
    /** @internal */
    toDefinition() {
        return { ...this.def };
    }
}
export const Field = {
    serial() {
        return new FieldBuilder("serial");
    },
    text() {
        return new FieldBuilder("text");
    },
    integer() {
        return new FieldBuilder("integer");
    },
    boolean() {
        return new FieldBuilder("boolean");
    },
    timestamp() {
        return new FieldBuilder("timestamp");
    },
    json() {
        return new FieldBuilder("json");
    },
    real() {
        return new FieldBuilder("real");
    },
    uuid() {
        return new FieldBuilder("uuid");
    },
};
//# sourceMappingURL=field.js.map
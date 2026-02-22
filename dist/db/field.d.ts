export type FieldType = "serial" | "text" | "integer" | "boolean" | "timestamp" | "json" | "real";
export interface FieldDefinition {
    type: FieldType;
    primaryKey: boolean;
    notNull: boolean;
    unique: boolean;
    defaultValue?: unknown;
}
export declare class FieldBuilder {
    private def;
    constructor(type: FieldType);
    primaryKey(): this;
    notNull(): this;
    unique(): this;
    default(value: unknown): this;
    /** @internal */
    toDefinition(): FieldDefinition;
}
export declare const Field: {
    serial(): FieldBuilder;
    text(): FieldBuilder;
    integer(): FieldBuilder;
    boolean(): FieldBuilder;
    timestamp(): FieldBuilder;
    json(): FieldBuilder;
    real(): FieldBuilder;
};
//# sourceMappingURL=field.d.ts.map
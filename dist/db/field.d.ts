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
export declare class FieldBuilder {
    private def;
    constructor(type: FieldType);
    primaryKey(): this;
    notNull(): this;
    unique(): this;
    default(value: unknown): this;
    references(target: {
        table: string;
    }, options?: {
        column?: string;
        onDelete?: string;
    }): this;
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
    uuid(): FieldBuilder;
};
//# sourceMappingURL=field.d.ts.map
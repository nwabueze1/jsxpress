import type { JsxpressRequest } from "./types.js";
export interface ValidationError {
    field: string;
    message: string;
}
export interface MethodSchema {
    body?: ObjectSchema;
    query?: ObjectSchema;
    params?: ObjectSchema;
}
export type ControllerSchema = Partial<Record<"get" | "post" | "put" | "patch" | "delete" | "head" | "options", MethodSchema>>;
type Rule = (value: unknown) => string | null;
declare abstract class BaseSchema {
    protected _optional: boolean;
    protected _rules: Rule[];
    optional(): this;
    validate(value: unknown, path: string): ValidationError[];
    protected abstract _validate(value: unknown, path: string): ValidationError[];
}
export declare class StringSchema extends BaseSchema {
    min(n: number): this;
    max(n: number): this;
    email(): this;
    pattern(regex: RegExp): this;
    protected _validate(value: unknown, path: string): ValidationError[];
}
export declare class NumberSchema extends BaseSchema {
    min(n: number): this;
    max(n: number): this;
    integer(): this;
    protected _validate(value: unknown, path: string): ValidationError[];
}
export declare class BooleanSchema extends BaseSchema {
    protected _validate(value: unknown, path: string): ValidationError[];
}
export declare class ObjectSchema extends BaseSchema {
    private shape;
    constructor(shape: Record<string, BaseSchema>);
    protected _validate(value: unknown, path: string): ValidationError[];
}
export declare class ArraySchema extends BaseSchema {
    private itemSchema;
    private _minItems?;
    private _maxItems?;
    constructor(itemSchema: BaseSchema);
    min(n: number): this;
    max(n: number): this;
    protected _validate(value: unknown, path: string): ValidationError[];
}
export declare const v: {
    string: () => StringSchema;
    number: () => NumberSchema;
    boolean: () => BooleanSchema;
    object: (shape: Record<string, BaseSchema>) => ObjectSchema;
    array: (itemSchema: BaseSchema) => ArraySchema;
};
interface ValidationSuccess {
    body?: unknown;
}
interface ValidationFailure {
    errors: ValidationError[];
}
export declare function validateRequest(req: JsxpressRequest, schema: MethodSchema): Promise<ValidationSuccess | ValidationFailure>;
export {};
//# sourceMappingURL=validation.d.ts.map
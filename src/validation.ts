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

export type ControllerSchema = Partial<
  Record<
    "get" | "post" | "put" | "patch" | "delete" | "head" | "options",
    MethodSchema
  >
>;

type Rule = (value: unknown) => string | null;

abstract class BaseSchema {
  protected _optional = false;
  protected _rules: Rule[] = [];

  optional(): this {
    this._optional = true;
    return this;
  }

  validate(value: unknown, path: string): ValidationError[] {
    if (value === null || value === undefined) {
      if (this._optional) return [];
      return [{ field: path, message: "Required" }];
    }
    return this._validate(value, path);
  }

  protected abstract _validate(value: unknown, path: string): ValidationError[];
}

export class StringSchema extends BaseSchema {
  min(n: number): this {
    this._rules.push((v) =>
      typeof v === "string" && v.length < n
        ? `Must be at least ${n} characters`
        : null
    );
    return this;
  }

  max(n: number): this {
    this._rules.push((v) =>
      typeof v === "string" && v.length > n
        ? `Must be at most ${n} characters`
        : null
    );
    return this;
  }

  email(): this {
    this._rules.push((v) =>
      typeof v === "string" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
        ? "Invalid email format"
        : null
    );
    return this;
  }

  pattern(regex: RegExp): this {
    this._rules.push((v) =>
      typeof v === "string" && !regex.test(v)
        ? `Must match pattern ${regex}`
        : null
    );
    return this;
  }

  protected _validate(value: unknown, path: string): ValidationError[] {
    if (typeof value !== "string") {
      return [{ field: path, message: "Expected a string" }];
    }
    const errors: ValidationError[] = [];
    for (const rule of this._rules) {
      const msg = rule(value);
      if (msg) errors.push({ field: path, message: msg });
    }
    return errors;
  }
}

export class NumberSchema extends BaseSchema {
  min(n: number): this {
    this._rules.push((v) =>
      typeof v === "number" && v < n ? `Must be at least ${n}` : null
    );
    return this;
  }

  max(n: number): this {
    this._rules.push((v) =>
      typeof v === "number" && v > n ? `Must be at most ${n}` : null
    );
    return this;
  }

  integer(): this {
    this._rules.push((v) =>
      typeof v === "number" && !Number.isInteger(v)
        ? "Must be an integer"
        : null
    );
    return this;
  }

  protected _validate(value: unknown, path: string): ValidationError[] {
    let num: number;
    if (typeof value === "number") {
      num = value;
    } else if (typeof value === "string" && value !== "" && !isNaN(Number(value))) {
      num = Number(value);
    } else {
      return [{ field: path, message: "Expected a number" }];
    }

    if (!isFinite(num)) {
      return [{ field: path, message: "Expected a number" }];
    }

    const errors: ValidationError[] = [];
    for (const rule of this._rules) {
      const msg = rule(num);
      if (msg) errors.push({ field: path, message: msg });
    }
    return errors;
  }
}

export class BooleanSchema extends BaseSchema {
  protected _validate(value: unknown, path: string): ValidationError[] {
    if (typeof value !== "boolean") {
      return [{ field: path, message: "Expected a boolean" }];
    }
    return [];
  }
}

export class ObjectSchema extends BaseSchema {
  private shape: Record<string, BaseSchema>;

  constructor(shape: Record<string, BaseSchema>) {
    super();
    this.shape = shape;
  }

  protected _validate(value: unknown, path: string): ValidationError[] {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return [{ field: path, message: "Expected an object" }];
    }

    const errors: ValidationError[] = [];
    const obj = value as Record<string, unknown>;

    for (const [key, schema] of Object.entries(this.shape)) {
      const fieldPath = path ? `${path}.${key}` : key;
      errors.push(...schema.validate(obj[key], fieldPath));
    }
    return errors;
  }
}

export class ArraySchema extends BaseSchema {
  private itemSchema: BaseSchema;
  private _minItems?: number;
  private _maxItems?: number;

  constructor(itemSchema: BaseSchema) {
    super();
    this.itemSchema = itemSchema;
  }

  min(n: number): this {
    this._minItems = n;
    return this;
  }

  max(n: number): this {
    this._maxItems = n;
    return this;
  }

  protected _validate(value: unknown, path: string): ValidationError[] {
    if (!Array.isArray(value)) {
      return [{ field: path, message: "Expected an array" }];
    }

    const errors: ValidationError[] = [];

    if (this._minItems !== undefined && value.length < this._minItems) {
      errors.push({
        field: path,
        message: `Must have at least ${this._minItems} items`,
      });
    }

    if (this._maxItems !== undefined && value.length > this._maxItems) {
      errors.push({
        field: path,
        message: `Must have at most ${this._maxItems} items`,
      });
    }

    for (let i = 0; i < value.length; i++) {
      errors.push(...this.itemSchema.validate(value[i], `${path}[${i}]`));
    }

    return errors;
  }
}

export { BaseSchema };

export const v = {
  string: () => new StringSchema(),
  number: () => new NumberSchema(),
  boolean: () => new BooleanSchema(),
  object: (shape: Record<string, BaseSchema>) => new ObjectSchema(shape),
  array: (itemSchema: BaseSchema) => new ArraySchema(itemSchema),
};

interface ValidationSuccess {
  body?: unknown;
}

interface ValidationFailure {
  errors: ValidationError[];
}

export async function validateRequest(
  req: JsxpressRequest,
  schema: MethodSchema
): Promise<ValidationSuccess | ValidationFailure> {
  const allErrors: ValidationError[] = [];
  let parsedBody: unknown;

  if (schema.body) {
    try {
      parsedBody = await req.json();
    } catch {
      return { errors: [{ field: "body", message: "Invalid JSON" }] };
    }
    allErrors.push(...schema.body.validate(parsedBody, "body"));
  }

  if (schema.query) {
    const queryObj: Record<string, string> = {};
    req.query.forEach((value, key) => {
      queryObj[key] = value;
    });
    allErrors.push(...schema.query.validate(queryObj, "query"));
  }

  if (schema.params) {
    allErrors.push(...schema.params.validate(req.params, "params"));
  }

  if (allErrors.length > 0) {
    return { errors: allErrors };
  }

  const result: ValidationSuccess = {};
  if (schema.body) {
    result.body = parsedBody;
  }
  return result;
}

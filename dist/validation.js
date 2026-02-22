class BaseSchema {
    _optional = false;
    _rules = [];
    optional() {
        this._optional = true;
        return this;
    }
    validate(value, path) {
        if (value === null || value === undefined) {
            if (this._optional)
                return [];
            return [{ field: path, message: "Required" }];
        }
        return this._validate(value, path);
    }
}
export class StringSchema extends BaseSchema {
    min(n) {
        this._rules.push((v) => typeof v === "string" && v.length < n
            ? `Must be at least ${n} characters`
            : null);
        return this;
    }
    max(n) {
        this._rules.push((v) => typeof v === "string" && v.length > n
            ? `Must be at most ${n} characters`
            : null);
        return this;
    }
    email() {
        this._rules.push((v) => typeof v === "string" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
            ? "Invalid email format"
            : null);
        return this;
    }
    pattern(regex) {
        this._rules.push((v) => typeof v === "string" && !regex.test(v)
            ? `Must match pattern ${regex}`
            : null);
        return this;
    }
    _validate(value, path) {
        if (typeof value !== "string") {
            return [{ field: path, message: "Expected a string" }];
        }
        const errors = [];
        for (const rule of this._rules) {
            const msg = rule(value);
            if (msg)
                errors.push({ field: path, message: msg });
        }
        return errors;
    }
}
export class NumberSchema extends BaseSchema {
    min(n) {
        this._rules.push((v) => typeof v === "number" && v < n ? `Must be at least ${n}` : null);
        return this;
    }
    max(n) {
        this._rules.push((v) => typeof v === "number" && v > n ? `Must be at most ${n}` : null);
        return this;
    }
    integer() {
        this._rules.push((v) => typeof v === "number" && !Number.isInteger(v)
            ? "Must be an integer"
            : null);
        return this;
    }
    _validate(value, path) {
        let num;
        if (typeof value === "number") {
            num = value;
        }
        else if (typeof value === "string" && value !== "" && !isNaN(Number(value))) {
            num = Number(value);
        }
        else {
            return [{ field: path, message: "Expected a number" }];
        }
        if (!isFinite(num)) {
            return [{ field: path, message: "Expected a number" }];
        }
        const errors = [];
        for (const rule of this._rules) {
            const msg = rule(num);
            if (msg)
                errors.push({ field: path, message: msg });
        }
        return errors;
    }
}
export class BooleanSchema extends BaseSchema {
    _validate(value, path) {
        if (typeof value !== "boolean") {
            return [{ field: path, message: "Expected a boolean" }];
        }
        return [];
    }
}
export class ObjectSchema extends BaseSchema {
    shape;
    constructor(shape) {
        super();
        this.shape = shape;
    }
    _validate(value, path) {
        if (typeof value !== "object" || value === null || Array.isArray(value)) {
            return [{ field: path, message: "Expected an object" }];
        }
        const errors = [];
        const obj = value;
        for (const [key, schema] of Object.entries(this.shape)) {
            const fieldPath = path ? `${path}.${key}` : key;
            errors.push(...schema.validate(obj[key], fieldPath));
        }
        return errors;
    }
}
export class ArraySchema extends BaseSchema {
    itemSchema;
    _minItems;
    _maxItems;
    constructor(itemSchema) {
        super();
        this.itemSchema = itemSchema;
    }
    min(n) {
        this._minItems = n;
        return this;
    }
    max(n) {
        this._maxItems = n;
        return this;
    }
    _validate(value, path) {
        if (!Array.isArray(value)) {
            return [{ field: path, message: "Expected an array" }];
        }
        const errors = [];
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
export const v = {
    string: () => new StringSchema(),
    number: () => new NumberSchema(),
    boolean: () => new BooleanSchema(),
    object: (shape) => new ObjectSchema(shape),
    array: (itemSchema) => new ArraySchema(itemSchema),
};
export async function validateRequest(req, schema) {
    const allErrors = [];
    let parsedBody;
    if (schema.body) {
        try {
            parsedBody = await req.json();
        }
        catch {
            return { errors: [{ field: "body", message: "Invalid JSON" }] };
        }
        allErrors.push(...schema.body.validate(parsedBody, "body"));
    }
    if (schema.query) {
        const queryObj = {};
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
    const result = {};
    if (schema.body) {
        result.body = parsedBody;
    }
    return result;
}
//# sourceMappingURL=validation.js.map
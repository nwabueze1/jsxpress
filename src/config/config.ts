import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Provider } from "../components/Provider.js";
import {
  BaseSchema,
  NumberSchema,
  BooleanSchema,
} from "../validation.js";

export const CONFIG_KEY: unique symbol = Symbol.for("jsxpress.config");

export interface ConfigProps {
  schema: Record<string, BaseSchema>;
  env?: string;
  values?: Record<string, unknown>;
  children?: unknown;
}

export function parseEnvFile(filePath: string): Record<string, string> {
  const resolved = resolve(filePath);
  let content: string;
  try {
    content = readFileSync(resolved, "utf-8");
  } catch {
    return {};
  }

  const result: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }
  return result;
}

function coerceStringValue(raw: string, schema: BaseSchema): unknown {
  if (schema instanceof NumberSchema) {
    const num = Number(raw);
    if (raw !== "" && !isNaN(num) && isFinite(num)) return num;
    return raw;
  }

  if (schema instanceof BooleanSchema) {
    const lower = raw.toLowerCase();
    if (["true", "1", "yes"].includes(lower)) return true;
    if (["false", "0", "no"].includes(lower)) return false;
    return raw;
  }

  return raw;
}

export function validateConfig(
  values: Record<string, unknown>,
  schema: Record<string, BaseSchema>,
): Record<string, unknown> {
  const coerced: Record<string, unknown> = { ...values };
  const errors: string[] = [];

  for (const [key, s] of Object.entries(schema)) {
    const raw = coerced[key];

    if (typeof raw === "string") {
      coerced[key] = coerceStringValue(raw, s);
    }

    const fieldErrors = s.validate(coerced[key], key);
    for (const e of fieldErrors) {
      errors.push(`${e.field}: ${e.message}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Config validation failed:\n  ${errors.join("\n  ")}`);
  }

  return coerced;
}

export class Config extends Provider {
  contextKey = CONFIG_KEY;
  private frozen: Record<string, unknown>;

  constructor(props: ConfigProps) {
    super();

    const schemaKeys = Object.keys(props.schema);

    // Layer 1: process.env (only schema keys)
    const fromEnv: Record<string, unknown> = {};
    for (const key of schemaKeys) {
      if (key in process.env) {
        fromEnv[key] = process.env[key];
      }
    }

    // Layer 2: .env file (only schema keys)
    let fromFile: Record<string, string> = {};
    if (props.env) {
      const parsed = parseEnvFile(props.env);
      for (const key of schemaKeys) {
        if (key in parsed) {
          fromFile[key] = parsed[key];
        }
      }
    }

    // Layer 3: inline values
    const inline = props.values ?? {};

    // Merge: process.env (lowest) → .env file → inline values (highest)
    const merged: Record<string, unknown> = {
      ...fromEnv,
      ...fromFile,
      ...inline,
    };

    this.frozen = Object.freeze(validateConfig(merged, props.schema));
  }

  getContextValue(): Record<string, unknown> {
    return this.frozen;
  }
}

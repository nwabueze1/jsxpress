import { describe, it, expect } from "vitest";
import { Field, FieldBuilder } from "../src/db/field.js";

describe("Field builders", () => {
  it("serial() creates a serial field", () => {
    const def = Field.serial().toDefinition();
    expect(def.type).toBe("serial");
    expect(def.primaryKey).toBe(false);
    expect(def.notNull).toBe(false);
  });

  it("text() creates a text field", () => {
    const def = Field.text().toDefinition();
    expect(def.type).toBe("text");
  });

  it("integer() creates an integer field", () => {
    const def = Field.integer().toDefinition();
    expect(def.type).toBe("integer");
  });

  it("boolean() creates a boolean field", () => {
    const def = Field.boolean().toDefinition();
    expect(def.type).toBe("boolean");
  });

  it("timestamp() creates a timestamp field", () => {
    const def = Field.timestamp().toDefinition();
    expect(def.type).toBe("timestamp");
  });

  it("json() creates a json field", () => {
    const def = Field.json().toDefinition();
    expect(def.type).toBe("json");
  });

  it("real() creates a real field", () => {
    const def = Field.real().toDefinition();
    expect(def.type).toBe("real");
  });

  it("primaryKey() sets primaryKey and notNull", () => {
    const def = Field.serial().primaryKey().toDefinition();
    expect(def.primaryKey).toBe(true);
    expect(def.notNull).toBe(true);
  });

  it("notNull() sets notNull", () => {
    const def = Field.text().notNull().toDefinition();
    expect(def.notNull).toBe(true);
  });

  it("unique() sets unique", () => {
    const def = Field.text().unique().toDefinition();
    expect(def.unique).toBe(true);
  });

  it("default() sets default value", () => {
    const def = Field.boolean().default(false).toDefinition();
    expect(def.defaultValue).toBe(false);
  });

  it("chains multiple modifiers", () => {
    const def = Field.text().notNull().unique().default("hello").toDefinition();
    expect(def.type).toBe("text");
    expect(def.notNull).toBe(true);
    expect(def.unique).toBe(true);
    expect(def.defaultValue).toBe("hello");
  });
});

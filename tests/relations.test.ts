import { describe, it, expect } from "vitest";
import { hasMany, hasOne, belongsTo } from "../src/db/relations.js";
import { Model } from "../src/db/model.js";
import { Field } from "../src/db/field.js";

class FakeTarget extends Model {
  static table = "targets";
  static schema = { id: Field.serial().primaryKey() };
}

describe("relation helpers", () => {
  it("hasMany returns correct definition", () => {
    const rel = hasMany(() => FakeTarget, "userId");
    expect(rel.type).toBe("hasMany");
    expect(rel.foreignKey).toBe("userId");
    expect(rel.target()).toBe(FakeTarget);
    expect(rel.onDelete).toBeUndefined();
  });

  it("hasOne returns correct definition", () => {
    const rel = hasOne(() => FakeTarget, "userId");
    expect(rel.type).toBe("hasOne");
    expect(rel.foreignKey).toBe("userId");
    expect(rel.target()).toBe(FakeTarget);
  });

  it("belongsTo returns correct definition", () => {
    const rel = belongsTo(() => FakeTarget, "userId");
    expect(rel.type).toBe("belongsTo");
    expect(rel.foreignKey).toBe("userId");
    expect(rel.target()).toBe(FakeTarget);
  });

  it("hasMany passes onDelete option", () => {
    const rel = hasMany(() => FakeTarget, "userId", { onDelete: "cascade" });
    expect(rel.onDelete).toBe("cascade");
  });

  it("hasOne passes onDelete option", () => {
    const rel = hasOne(() => FakeTarget, "userId", { onDelete: "set null" });
    expect(rel.onDelete).toBe("set null");
  });

  it("belongsTo passes onDelete option", () => {
    const rel = belongsTo(() => FakeTarget, "userId", { onDelete: "restrict" });
    expect(rel.onDelete).toBe("restrict");
  });
});

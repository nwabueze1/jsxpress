import type { Model } from "./model.js";

export type OnDelete = "cascade" | "set null" | "restrict" | "no action";
export type RelationType = "hasMany" | "hasOne" | "belongsTo";

export interface RelationDefinition {
  type: RelationType;
  target: () => typeof Model;
  foreignKey: string;
  onDelete?: OnDelete;
}

export function hasMany(
  target: () => typeof Model,
  foreignKey: string,
  options?: { onDelete?: OnDelete },
): RelationDefinition {
  return { type: "hasMany", target, foreignKey, onDelete: options?.onDelete };
}

export function hasOne(
  target: () => typeof Model,
  foreignKey: string,
  options?: { onDelete?: OnDelete },
): RelationDefinition {
  return { type: "hasOne", target, foreignKey, onDelete: options?.onDelete };
}

export function belongsTo(
  target: () => typeof Model,
  foreignKey: string,
  options?: { onDelete?: OnDelete },
): RelationDefinition {
  return { type: "belongsTo", target, foreignKey, onDelete: options?.onDelete };
}

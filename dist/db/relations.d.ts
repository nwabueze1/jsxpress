import type { Model } from "./model.js";
export type OnDelete = "cascade" | "set null" | "restrict" | "no action";
export type RelationType = "hasMany" | "hasOne" | "belongsTo";
export interface RelationDefinition {
    type: RelationType;
    target: () => typeof Model;
    foreignKey: string;
    onDelete?: OnDelete;
}
export declare function hasMany(target: () => typeof Model, foreignKey: string, options?: {
    onDelete?: OnDelete;
}): RelationDefinition;
export declare function hasOne(target: () => typeof Model, foreignKey: string, options?: {
    onDelete?: OnDelete;
}): RelationDefinition;
export declare function belongsTo(target: () => typeof Model, foreignKey: string, options?: {
    onDelete?: OnDelete;
}): RelationDefinition;
//# sourceMappingURL=relations.d.ts.map
export function hasMany(target, foreignKey, options) {
    return { type: "hasMany", target, foreignKey, onDelete: options?.onDelete };
}
export function hasOne(target, foreignKey, options) {
    return { type: "hasOne", target, foreignKey, onDelete: options?.onDelete };
}
export function belongsTo(target, foreignKey, options) {
    return { type: "belongsTo", target, foreignKey, onDelete: options?.onDelete };
}
//# sourceMappingURL=relations.js.map
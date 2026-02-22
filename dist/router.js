export class Router {
    table;
    constructor(table) {
        this.table = table;
    }
    match(path, method) {
        const methods = this.table.get(path);
        if (!methods)
            return null;
        return methods.get(method) ?? null;
    }
}
//# sourceMappingURL=router.js.map
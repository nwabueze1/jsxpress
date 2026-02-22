import type { HttpMethod, Route, RouteTable } from "./types.js";
export declare class Router {
    private table;
    constructor(table: RouteTable);
    match(path: string, method: HttpMethod): Route | null;
}
//# sourceMappingURL=router.d.ts.map
import type { HttpMethod, Route, RouteTable } from "./types.js";

export class Router {
  private table: RouteTable;

  constructor(table: RouteTable) {
    this.table = table;
  }

  match(path: string, method: HttpMethod): Route | null {
    const methods = this.table.get(path);
    if (!methods) return null;
    return methods.get(method) ?? null;
  }
}

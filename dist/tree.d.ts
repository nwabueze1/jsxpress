import type { JsxElement, RouteTable } from "./types.js";
import { Provider } from "./components/Provider.js";
export interface CompileResult {
    table: RouteTable;
    providers: Provider[];
}
export declare function compileTree(root: JsxElement): CompileResult;
//# sourceMappingURL=tree.d.ts.map
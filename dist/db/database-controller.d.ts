import { Controller } from "../components/Controller.js";
import type { DatabaseAdapter } from "./adapter.js";
export declare abstract class DatabaseController extends Controller {
    get db(): DatabaseAdapter;
}
//# sourceMappingURL=database-controller.d.ts.map
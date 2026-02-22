import { Controller } from "../components/Controller.js";
import { DATABASE_KEY } from "./database.js";
export class DatabaseController extends Controller {
    get db() {
        return this.context(DATABASE_KEY);
    }
}
//# sourceMappingURL=database-controller.js.map
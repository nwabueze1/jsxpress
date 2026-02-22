import { Controller } from "../components/Controller.js";
import { CONFIG_KEY } from "./config.js";
export class ConfigController extends Controller {
    get cfg() {
        return this.context(CONFIG_KEY);
    }
}
//# sourceMappingURL=config-controller.js.map
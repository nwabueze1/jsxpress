import { Controller } from "../components/Controller.js";
import { CONFIG_KEY } from "./config.js";

export abstract class ConfigController<T = Record<string, unknown>> extends Controller {
  get cfg(): T {
    return this.context<T>(CONFIG_KEY);
  }
}

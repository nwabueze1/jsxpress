import { Controller } from "../components/Controller.js";
import type { DatabaseAdapter } from "./adapter.js";
import { DATABASE_KEY } from "./database.js";

export abstract class DatabaseController extends Controller {
  get db(): DatabaseAdapter {
    return this.context<DatabaseAdapter>(DATABASE_KEY);
  }
}

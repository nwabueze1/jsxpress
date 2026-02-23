import type { DatabaseAdapter } from "./adapter.js";

export abstract class Repository {
  constructor(protected db: DatabaseAdapter) {}
}

import type { ServerAdapter } from "./types.js";
import { isBun } from "./detect.js";

export type { ServerAdapter, ServerHandle } from "./types.js";

export async function createAdapter(): Promise<ServerAdapter> {
  if (isBun()) {
    const { BunAdapter } = await import("./bun.js");
    return new BunAdapter();
  }
  const { NodeAdapter } = await import("./node.js");
  return new NodeAdapter();
}

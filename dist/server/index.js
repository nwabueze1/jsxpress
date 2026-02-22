import { isBun } from "./detect.js";
export async function createAdapter() {
    if (isBun()) {
        const { BunAdapter } = await import("./bun.js");
        return new BunAdapter();
    }
    const { NodeAdapter } = await import("./node.js");
    return new NodeAdapter();
}
//# sourceMappingURL=index.js.map
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Model } from "./model.js";
export async function discoverModels(modelsDir) {
    let entries;
    try {
        entries = await readdir(modelsDir);
    }
    catch {
        throw new Error(`Models directory not found: ${modelsDir}`);
    }
    const modelFiles = entries.filter((f) => /\.(ts|js|mjs)$/.test(f));
    const models = [];
    for (const file of modelFiles) {
        const filePath = join(modelsDir, file);
        const fileUrl = pathToFileURL(filePath).href;
        const mod = await import(fileUrl);
        for (const exportValue of Object.values(mod)) {
            if (typeof exportValue === "function" &&
                exportValue.prototype instanceof Model &&
                exportValue.table &&
                exportValue.schema) {
                models.push(exportValue);
            }
        }
    }
    return models;
}
//# sourceMappingURL=model-discovery.js.map
import { mkdir, writeFile, access } from "node:fs/promises";
import { dirname } from "node:path";
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
async function exists(path) {
    try {
        await access(path);
        return true;
    }
    catch {
        return false;
    }
}
export async function mkdirIfNeeded(path) {
    await mkdir(path, { recursive: true });
}
export async function writeFileWithLog(path, content, force = false) {
    if (!force && (await exists(path))) {
        console.log(yellow(`  skipped  `) + path + " (already exists)");
        return false;
    }
    await mkdirIfNeeded(dirname(path));
    await writeFile(path, content, "utf-8");
    console.log(green(`  created  `) + path);
    return true;
}
//# sourceMappingURL=fs.js.map
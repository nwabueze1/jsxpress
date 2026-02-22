import { join } from "node:path";
import { readdir } from "node:fs/promises";
import { writeFileWithLog } from "../utils/fs.js";
import { controllerTemplate } from "../templates/controller.js";
import { modelTemplate } from "../templates/model.js";
import { middlewareTemplate } from "../templates/middleware.js";
import { migrationTemplate } from "../templates/migration.js";
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const VALID_TYPES = ["controller", "model", "middleware", "migration"];
function parseFields(args) {
    return args
        .filter((a) => a.includes(":"))
        .map((a) => {
        const [name, type] = a.split(":");
        return { name, type };
    });
}
async function dirExists(path) {
    try {
        const { stat } = await import("node:fs/promises");
        const s = await stat(path);
        return s.isDirectory();
    }
    catch {
        return false;
    }
}
async function nextMigrationNumber(migrationsDir) {
    try {
        const entries = await readdir(migrationsDir);
        let max = 0;
        for (const entry of entries) {
            const match = entry.match(/^(\d+)/);
            if (match) {
                const n = parseInt(match[1], 10);
                if (n > max)
                    max = n;
            }
        }
        return max + 1;
    }
    catch {
        return 1;
    }
}
function pad(n, width) {
    return String(n).padStart(width, "0");
}
export async function generate(type, name, args, force) {
    if (!VALID_TYPES.includes(type)) {
        console.log(red(`Unknown type: ${type}`));
        console.log(`Valid types: ${VALID_TYPES.join(", ")}`);
        return;
    }
    if (!name) {
        console.log(red("Name is required."));
        return;
    }
    const cwd = process.cwd();
    switch (type) {
        case "controller": {
            if (!(await dirExists(join(cwd, "src")))) {
                console.log(red("Not in a jsxpress project. No src/ directory found."));
                return;
            }
            const filePath = join(cwd, "src", "controllers", `${name}.ts`);
            await writeFileWithLog(filePath, controllerTemplate(name), force);
            break;
        }
        case "model": {
            if (!(await dirExists(join(cwd, "src")))) {
                console.log(red("Not in a jsxpress project. No src/ directory found."));
                return;
            }
            const fields = parseFields(args);
            const className = name.charAt(0).toUpperCase() + name.slice(1);
            const filePath = join(cwd, "src", "models", `${className}.ts`);
            await writeFileWithLog(filePath, modelTemplate(className, fields), force);
            break;
        }
        case "middleware": {
            if (!(await dirExists(join(cwd, "src")))) {
                console.log(red("Not in a jsxpress project. No src/ directory found."));
                return;
            }
            const filePath = join(cwd, "src", "middleware", `${name}.ts`);
            await writeFileWithLog(filePath, middlewareTemplate(name), force);
            break;
        }
        case "migration": {
            const migrationsDir = join(cwd, "migrations");
            if (!(await dirExists(migrationsDir))) {
                console.log(red("No migrations/ directory found."));
                return;
            }
            const num = await nextMigrationNumber(migrationsDir);
            const filePath = join(migrationsDir, `${pad(num, 3)}_${name}.ts`);
            await writeFileWithLog(filePath, migrationTemplate(), force);
            break;
        }
    }
}
//# sourceMappingURL=generate.js.map
import { join } from "node:path";
import { writeFileWithLog } from "../utils/fs.js";
import { controllerTemplate } from "../templates/controller.js";
import { modelTemplate } from "../templates/model.js";
import { middlewareTemplate } from "../templates/middleware.js";
import { migrationTemplate } from "../templates/migration.js";
import { nextMigrationNumber, pad } from "../utils/migration.js";

const red = (s: string) => `\x1b[31m${s}\x1b[0m`;

const VALID_TYPES = ["controller", "model", "middleware", "migration"];

function parseFields(args: string[]): { name: string; type: string }[] {
  return args
    .filter((a) => a.includes(":"))
    .map((a) => {
      const [name, type] = a.split(":");
      return { name, type };
    });
}

async function dirExists(path: string): Promise<boolean> {
  try {
    const { stat } = await import("node:fs/promises");
    const s = await stat(path);
    return s.isDirectory();
  } catch {
    return false;
  }
}

export async function generate(
  type: string,
  name: string,
  args: string[],
  force: boolean,
): Promise<void> {
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

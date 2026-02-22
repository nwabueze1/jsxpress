import { join, basename } from "node:path";
import { readdir } from "node:fs/promises";
import { writeFileWithLog, mkdirIfNeeded } from "../utils/fs.js";
import { ask, select, confirm } from "../utils/prompt.js";
import {
  appTemplate,
  homeControllerTemplate,
  tsconfigTemplate,
  packageJsonTemplate,
  gitignoreTemplate,
} from "../templates/project.js";

const green = (s: string) => `\x1b[32m${s}\x1b[0m`;

async function isDirEmpty(path: string): Promise<boolean> {
  try {
    const entries = await readdir(path);
    return entries.length === 0;
  } catch {
    return true;
  }
}

export async function init(projectName?: string): Promise<void> {
  const name = projectName || (await ask(`Project name (${basename(process.cwd())}): `)) || basename(process.cwd());

  const dialect = await select("Select database:", [
    "sqlite",
    "postgres",
    "mysql",
    "mongodb",
    "none",
  ]);

  const targetDir = join(process.cwd(), name);

  if (!(await isDirEmpty(targetDir))) {
    const proceed = await confirm("Directory is not empty. Continue?");
    if (!proceed) {
      console.log("Aborted.");
      return;
    }
  }

  // Create directory structure
  await mkdirIfNeeded(join(targetDir, "src", "controllers"));

  if (dialect !== "none") {
    await mkdirIfNeeded(join(targetDir, "src", "models"));
    if (dialect !== "mongodb") {
      await mkdirIfNeeded(join(targetDir, "migrations"));
    }
  }

  // Write files
  const files: [string, string][] = [
    [join(targetDir, "package.json"), packageJsonTemplate(name, dialect)],
    [join(targetDir, "tsconfig.json"), tsconfigTemplate()],
    [join(targetDir, ".gitignore"), gitignoreTemplate()],
    [join(targetDir, "src", "app.tsx"), appTemplate(dialect)],
    [join(targetDir, "src", "controllers", "home.ts"), homeControllerTemplate()],
  ];

  for (const [path, content] of files) {
    await writeFileWithLog(path, content);
  }

  console.log("");
  console.log(green("Done!") + ` Project ${name} created.`);
  console.log("");
  console.log("Next steps:");
  console.log(`  cd ${name}`);
  console.log("  npm install");
  console.log("  npx jsxserve dev");
}

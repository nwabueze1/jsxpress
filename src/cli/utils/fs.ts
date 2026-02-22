import { mkdir, writeFile, access } from "node:fs/promises";
import { dirname } from "node:path";

const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function mkdirIfNeeded(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

export async function writeFileWithLog(
  path: string,
  content: string,
  force = false,
): Promise<boolean> {
  if (!force && (await exists(path))) {
    console.log(yellow(`  skipped  `) + path + " (already exists)");
    return false;
  }
  await mkdirIfNeeded(dirname(path));
  await writeFile(path, content, "utf-8");
  console.log(green(`  created  `) + path);
  return true;
}

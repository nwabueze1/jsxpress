import { spawn } from "node:child_process";

export async function build(): Promise<void> {
  const child = spawn("npx", ["tsc"], {
    stdio: "inherit",
    shell: false,
  });

  child.on("close", (code) => {
    process.exit(code ?? 0);
  });
}

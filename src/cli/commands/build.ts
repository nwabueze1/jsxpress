import { spawn } from "node:child_process";

export async function build(): Promise<void> {
  const tsc = spawn("npx", ["tsc"], {
    stdio: "inherit",
    shell: false,
  });

  tsc.on("close", (code) => {
    if (code !== 0) {
      process.exit(code ?? 1);
    }

    // Rewrite path aliases in compiled output
    const alias = spawn("npx", ["tsc-alias"], {
      stdio: "inherit",
      shell: false,
    });

    alias.on("close", (aliasCode) => {
      process.exit(aliasCode ?? 0);
    });
  });
}

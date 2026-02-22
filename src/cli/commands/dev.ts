import { spawn } from "node:child_process";
import { isBun } from "../../server/detect.js";

export async function dev(): Promise<void> {
  const cmd = isBun()
    ? { bin: "bun", args: ["--watch", "src/app.tsx"] }
    : { bin: "npx", args: ["tsx", "watch", "src/app.tsx"] };

  const child = spawn(cmd.bin, cmd.args, {
    stdio: "inherit",
    shell: false,
  });

  child.on("close", (code) => {
    process.exit(code ?? 0);
  });
}

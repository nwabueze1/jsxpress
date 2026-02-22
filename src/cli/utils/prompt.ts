import { createInterface } from "node:readline";

function rl() {
  return createInterface({ input: process.stdin, output: process.stdout });
}

export function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    const r = rl();
    r.question(question, (answer) => {
      r.close();
      resolve(answer.trim());
    });
  });
}

export async function select(question: string, options: string[]): Promise<string> {
  console.log(question);
  for (let i = 0; i < options.length; i++) {
    console.log(`  ${i + 1}) ${options[i]}`);
  }
  const answer = await ask("Enter number: ");
  const idx = parseInt(answer, 10) - 1;
  if (idx >= 0 && idx < options.length) {
    return options[idx];
  }
  return options[0];
}

export async function confirm(question: string): Promise<boolean> {
  const answer = await ask(`${question} (y/N) `);
  return answer.toLowerCase() === "y";
}

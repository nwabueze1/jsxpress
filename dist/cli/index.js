#!/usr/bin/env node
import { init } from "./commands/init.js";
import { generate } from "./commands/generate.js";
import { dev } from "./commands/dev.js";
import { build } from "./commands/build.js";
import { migrate } from "./commands/migrate.js";
const HELP = `
Usage: jsxserve <command> [options]

Commands:
  init [name]                         Create a new jsxserve project
  generate <type> <name> [fields...]  Generate a component (alias: g)
  dev                                 Start development server with watch mode
  build                               Compile TypeScript with tsc
  migrate <up|down|status>            Run database migrations
  migrate generate [name]             Auto-generate migration from model diff

Generate types:
  controller  Generate a controller class
  model       Generate a model class (fields as name:type)
  middleware  Generate a middleware class
  migration   Generate a migration file

Options:
  --force     Overwrite existing files
  --help      Show this help message

Examples:
  jsxserve init my-app
  jsxserve g controller users
  jsxserve g model Post title:text views:integer
  jsxserve g middleware auth
  jsxserve g migration create_users
  jsxserve dev
  jsxserve migrate up
`.trim();
function parseArgs(argv) {
    const force = argv.includes("--force");
    const filtered = argv.filter((a) => a !== "--force");
    const command = filtered[0] ?? "";
    const args = filtered.slice(1);
    return { command, args, force };
}
async function main() {
    const { command, args, force } = parseArgs(process.argv.slice(2));
    switch (command) {
        case "init":
            await init(args[0]);
            break;
        case "generate":
        case "g":
            await generate(args[0], args[1], args.slice(2), force);
            break;
        case "dev":
            await dev();
            break;
        case "build":
            await build();
            break;
        case "migrate":
            await migrate(args[0], args.slice(1));
            break;
        case "--help":
        case "":
            console.log(HELP);
            break;
        default:
            console.log(`Unknown command: ${command}`);
            console.log("");
            console.log(HELP);
            break;
    }
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map
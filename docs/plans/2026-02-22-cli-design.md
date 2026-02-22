# jsxpress CLI Design

## Overview

A zero-dependency CLI tool built into the jsxpress package. It provides project scaffolding, component generators, dev server, build tooling, and migration management.

Command: `jsxpress` (via `bin` entry in package.json).

## Commands

```
jsxpress init [project-name]        # Scaffold a new project
jsxpress generate <type> <name>     # Generate a component
jsxpress g <type> <name>            # Shorthand for generate
jsxpress dev                        # Start dev server with watch
jsxpress build                      # Compile TypeScript for production
jsxpress migrate up                 # Run pending migrations
jsxpress migrate down               # Rollback last migration
jsxpress migrate status             # Show migration status
```

## jsxpress init

Interactive prompts using `node:readline`:

1. Project name (default: directory name or provided arg)
2. Database dialect: sqlite / postgres / mysql / mongodb / none

Generates:

```
<project-name>/
├── src/
│   ├── app.tsx              # JSX tree with App, Database (if selected), example controller
│   ├── controllers/
│   │   └── home.ts          # Example HomeController
│   └── models/              # Empty directory
├── migrations/              # Empty (omitted if database = "none")
├── package.json             # jsxpress dep, dev/build/start scripts
├── tsconfig.json            # JSX config for jsxpress
└── .gitignore
```

If database = "none", `app.tsx` omits the `<Database>` wrapper and `migrations/` is not created.

If target directory exists and is non-empty, prompt "Directory not empty. Continue? (y/n)".

## jsxpress generate (g)

### controller

`jsxpress g controller users` creates `src/controllers/users.ts`:

```ts
import { Controller } from "jsxpress";
import type { JsxpressRequest } from "jsxpress";

export class Users extends Controller {
  name = "users";

  async get(req: JsxpressRequest) {
    return { message: "GET /users" };
  }
}
```

### model

`jsxpress g model Post title:text body:text` creates `src/models/Post.ts`:

```ts
import { Model, Field } from "jsxpress";

export class Post extends Model {
  static table = "posts";
  static schema = {
    id: Field.serial().primaryKey(),
    title: Field.text().notNull(),
    body: Field.text().notNull(),
  };
}
```

Supported field types match `FieldType`: serial, text, integer, boolean, timestamp, json, real.

### middleware

`jsxpress g middleware auth` creates `src/middleware/auth.ts`:

```ts
import { Middleware } from "jsxpress";
import type { JsxpressRequest } from "jsxpress";

export class Auth extends Middleware {
  name = "auth";

  async handle(req: JsxpressRequest, next: () => Promise<Response>): Promise<Response> {
    return next();
  }
}
```

### migration

`jsxpress g migration add_posts` creates `migrations/NNN_add_posts.ts`:

```ts
import type { DatabaseAdapter } from "jsxpress";

export async function up(adapter: DatabaseAdapter) {
  await adapter.raw("");
}

export async function down(adapter: DatabaseAdapter) {
  await adapter.raw("");
}
```

`NNN` is auto-incremented based on existing migration files.

## Error Handling

- File already exists: print warning, skip. Use `--force` to override.
- Not in a jsxpress project (no `src/`): print "Not in a jsxpress project. Run jsxpress init first."
- Output: `  created  src/controllers/users.ts` (green). Errors in red.

## jsxpress dev

Detects runtime:
- Bun: `bun --watch src/app.tsx`
- Node: `npx tsx watch src/app.tsx`

Forwards stdout/stderr, exits with child exit code.

## jsxpress build

Runs `npx tsc` using the project's tsconfig.json.

## jsxpress migrate

Reads DB config from environment variables: `DB_DIALECT` and `DB_URL`.

- `up`: connects, runs `MigrationRunner.up()`, prints applied migrations
- `down`: runs `MigrationRunner.down()`, prints rolled-back migration
- `status`: prints table of applied and pending migrations

## Architecture

All CLI code lives in `src/cli/`:

```
src/cli/
├── index.ts                # Entry point — parses process.argv, dispatches
├── commands/
│   ├── init.ts
│   ├── generate.ts
│   ├── dev.ts
│   ├── build.ts
│   └── migrate.ts
├── templates/
│   ├── project.ts          # Full scaffold templates
│   ├── controller.ts
│   ├── model.ts
│   ├── middleware.ts
│   └── migration.ts
└── utils/
    ├── prompt.ts           # node:readline prompts
    └── fs.ts               # mkdir + writeFile with colored output
```

## Design Decisions

1. **Same package**: CLI lives in jsxpress, no separate create-jsxpress package
2. **Zero dependencies**: All prompts/file ops use Node built-ins
3. **String templates**: Template functions return strings, no template engine
4. **Thin dev wrapper**: Delegates to tsx/bun --watch, no custom file watcher
5. **ENV-based migrate config**: `DB_DIALECT` + `DB_URL` for migration commands

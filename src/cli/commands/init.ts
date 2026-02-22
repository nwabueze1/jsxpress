import { join, basename } from "node:path";
import { readdir } from "node:fs/promises";
import { writeFileWithLog, mkdirIfNeeded } from "../utils/fs.js";
import { ask, select, confirm } from "../utils/prompt.js";
import {
  appTemplate,
  homeControllerTemplate,
  tsconfigTemplate,
  packageJsonTemplate,
  envTemplate,
  gitignoreTemplate,
} from "../templates/project.js";
import {
  authJwtTemplate,
  authPasswordTemplate,
  authOAuthUtilTemplate,
  userModelTemplate,
  oauthAccountModelTemplate,
  refreshTokenModelTemplate,
  userMigrationTemplate,
  oauthAccountMigrationTemplate,
  refreshTokenMigrationTemplate,
  authMiddlewareTemplate,
  authRegisterControllerTemplate,
  authLoginControllerTemplate,
  authRefreshControllerTemplate,
  authLogoutControllerTemplate,
  authOAuthControllerTemplate,
  authOAuthCallbackControllerTemplate,
} from "../templates/auth.js";

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

  let authEnabled = false;
  let googleOAuth = false;
  let facebookOAuth = false;
  let githubOAuth = false;

  if (dialect !== "none") {
    authEnabled = await confirm("Enable authentication?");
    if (authEnabled) {
      googleOAuth = await confirm("Enable Google login?");
      facebookOAuth = await confirm("Enable Facebook login?");
      githubOAuth = await confirm("Enable GitHub login?");
    }
  }

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

  if (authEnabled) {
    await mkdirIfNeeded(join(targetDir, "src", "auth"));
    await mkdirIfNeeded(join(targetDir, "src", "controllers", "auth"));
    await mkdirIfNeeded(join(targetDir, "src", "middleware"));

    if (googleOAuth || facebookOAuth || githubOAuth) {
      await mkdirIfNeeded(join(targetDir, "src", "auth", "oauth"));
    }
  }

  // Build auth config for templates
  const authConfig = authEnabled
    ? { enabled: true, google: googleOAuth, facebook: facebookOAuth, github: githubOAuth }
    : undefined;

  // Write files
  const files: [string, string][] = [
    [join(targetDir, "package.json"), packageJsonTemplate(name, dialect, authEnabled)],
    [join(targetDir, "tsconfig.json"), tsconfigTemplate()],
    [join(targetDir, ".env"), envTemplate(dialect, authConfig)],
    [join(targetDir, ".gitignore"), gitignoreTemplate()],
    [join(targetDir, "src", "app.tsx"), appTemplate(dialect, authConfig)],
    [join(targetDir, "src", "controllers", "home.ts"), homeControllerTemplate()],
  ];

  if (authEnabled) {
    // Core auth files
    files.push(
      [join(targetDir, "src", "auth", "jwt.ts"), authJwtTemplate()],
      [join(targetDir, "src", "auth", "password.ts"), authPasswordTemplate()],
    );

    // Models
    files.push(
      [join(targetDir, "src", "models", "User.ts"), userModelTemplate()],
      [join(targetDir, "src", "models", "OAuthAccount.ts"), oauthAccountModelTemplate()],
      [join(targetDir, "src", "models", "RefreshToken.ts"), refreshTokenModelTemplate()],
    );

    // Middleware
    files.push(
      [join(targetDir, "src", "middleware", "auth.ts"), authMiddlewareTemplate()],
    );

    // Auth controllers
    files.push(
      [join(targetDir, "src", "controllers", "auth", "register.ts"), authRegisterControllerTemplate()],
      [join(targetDir, "src", "controllers", "auth", "login.ts"), authLoginControllerTemplate()],
      [join(targetDir, "src", "controllers", "auth", "refresh.ts"), authRefreshControllerTemplate()],
      [join(targetDir, "src", "controllers", "auth", "logout.ts"), authLogoutControllerTemplate()],
    );

    // Migrations (SQL only)
    if (dialect !== "mongodb") {
      files.push(
        [join(targetDir, "migrations", "001_create_users.ts"), userMigrationTemplate(dialect)],
        [join(targetDir, "migrations", "002_create_oauth_accounts.ts"), oauthAccountMigrationTemplate(dialect)],
        [join(targetDir, "migrations", "003_create_refresh_tokens.ts"), refreshTokenMigrationTemplate(dialect)],
      );
    }

    // OAuth per-provider files
    const providers = [
      { key: "google", enabled: googleOAuth },
      { key: "facebook", enabled: facebookOAuth },
      { key: "github", enabled: githubOAuth },
    ];

    for (const { key, enabled } of providers) {
      if (enabled) {
        files.push(
          [join(targetDir, "src", "auth", "oauth", `${key}.ts`), authOAuthUtilTemplate(key)],
          [join(targetDir, "src", "controllers", "auth", `${key}.ts`), authOAuthControllerTemplate(key)],
          [join(targetDir, "src", "controllers", "auth", `${key}-callback.ts`), authOAuthCallbackControllerTemplate(key)],
        );
      }
    }
  }

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

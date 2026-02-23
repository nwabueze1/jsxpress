import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFile, rm, mkdir, access } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Mock prompts so init doesn't block on stdin
vi.mock("../../src/cli/utils/prompt.js", () => ({
  ask: vi.fn().mockResolvedValue("test-project"),
  select: vi.fn().mockResolvedValue("none"),
  confirm: vi.fn().mockResolvedValue(false),
}));

import { init } from "../../src/cli/commands/init.js";
import { select, confirm } from "../../src/cli/utils/prompt.js";

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe("init", () => {
  let tmp: string;
  let origCwd: string;

  beforeEach(async () => {
    tmp = join(tmpdir(), `jsxpress-init-${Date.now()}`);
    await mkdir(tmp, { recursive: true });
    origCwd = process.cwd();
    process.chdir(tmp);
  });

  afterEach(async () => {
    process.chdir(origCwd);
    await rm(tmp, { recursive: true, force: true });
  });

  it("creates correct directory structure with sqlite", async () => {
    vi.mocked(select).mockResolvedValueOnce("sqlite");
    await init("my-app");
    const dir = join(tmp, "my-app");

    expect(await exists(join(dir, "package.json"))).toBe(true);
    expect(await exists(join(dir, "tsconfig.json"))).toBe(true);
    expect(await exists(join(dir, ".gitignore"))).toBe(true);
    expect(await exists(join(dir, "src", "app.tsx"))).toBe(true);
    expect(await exists(join(dir, "src", "controllers", "home.ts"))).toBe(true);
    expect(await exists(join(dir, "src", "models"))).toBe(true);
    expect(await exists(join(dir, "migrations"))).toBe(true);
    expect(await exists(join(dir, ".env"))).toBe(true);
  });

  it("creates structure without migrations/ when none selected", async () => {
    vi.mocked(select).mockResolvedValueOnce("none");
    await init("no-db-app");
    const dir = join(tmp, "no-db-app");

    expect(await exists(join(dir, "src", "app.tsx"))).toBe(true);
    expect(await exists(join(dir, "migrations"))).toBe(false);
    expect(await exists(join(dir, "src", "models"))).toBe(false);
  });

  it("app.tsx contains Database wrapper when dialect selected", async () => {
    vi.mocked(select).mockResolvedValueOnce("sqlite");
    await init("db-app");
    const content = await readFile(join(tmp, "db-app", "src", "app.tsx"), "utf-8");
    expect(content).toContain('<Database dialect="sqlite"');
  });

  it("app.tsx omits Database when none", async () => {
    vi.mocked(select).mockResolvedValueOnce("none");
    await init("plain-app");
    const content = await readFile(join(tmp, "plain-app", "src", "app.tsx"), "utf-8");
    expect(content).not.toContain("Database");
  });

  it("package.json includes correct DB dependency", async () => {
    vi.mocked(select).mockResolvedValueOnce("postgres");
    await init("pg-app");
    const content = await readFile(join(tmp, "pg-app", "package.json"), "utf-8");
    expect(content).toContain('"pg"');
  });

  it(".env includes DATABASE_URL when dialect selected", async () => {
    vi.mocked(select).mockResolvedValueOnce("sqlite");
    await init("env-app");
    const content = await readFile(join(tmp, "env-app", ".env"), "utf-8");
    expect(content).toContain("DATABASE_URL=./data.db");
    expect(content).toContain("PORT=3000");
  });

  it(".env omits DATABASE_URL when none", async () => {
    vi.mocked(select).mockResolvedValueOnce("none");
    await init("no-db-env-app");
    const content = await readFile(join(tmp, "no-db-env-app", ".env"), "utf-8");
    expect(content).not.toContain("DATABASE_URL");
  });

  // ── Auth integration tests ──

  it("creates auth files when auth enabled with sqlite", async () => {
    vi.mocked(select).mockResolvedValueOnce("sqlite");
    // confirm calls: auth? -> yes, google? -> yes, facebook? -> no, github? -> no
    vi.mocked(confirm)
      .mockResolvedValueOnce(true)   // Enable authentication?
      .mockResolvedValueOnce(true)   // Enable Google login?
      .mockResolvedValueOnce(false)  // Enable Facebook login?
      .mockResolvedValueOnce(false); // Enable GitHub login?

    await init("auth-app");
    const dir = join(tmp, "auth-app");

    // Core auth files
    expect(await exists(join(dir, "src", "auth", "jwt.ts"))).toBe(true);
    expect(await exists(join(dir, "src", "auth", "password.ts"))).toBe(true);

    // Models
    expect(await exists(join(dir, "src", "models", "User.ts"))).toBe(true);
    expect(await exists(join(dir, "src", "models", "OAuthAccount.ts"))).toBe(true);
    expect(await exists(join(dir, "src", "models", "RefreshToken.ts"))).toBe(true);

    // Middleware
    expect(await exists(join(dir, "src", "middleware", "auth.ts"))).toBe(true);

    // Auth controllers
    expect(await exists(join(dir, "src", "controllers", "auth", "register.ts"))).toBe(true);
    expect(await exists(join(dir, "src", "controllers", "auth", "login.ts"))).toBe(true);
    expect(await exists(join(dir, "src", "controllers", "auth", "refresh.ts"))).toBe(true);
    expect(await exists(join(dir, "src", "controllers", "auth", "logout.ts"))).toBe(true);

    // Repositories
    expect(await exists(join(dir, "src", "repositories", "UserRepository.ts"))).toBe(true);
    expect(await exists(join(dir, "src", "repositories", "OAuthAccountRepository.ts"))).toBe(true);
    expect(await exists(join(dir, "src", "repositories", "RefreshTokenRepository.ts"))).toBe(true);

    // Google OAuth files (enabled)
    expect(await exists(join(dir, "src", "auth", "oauth", "google.ts"))).toBe(true);
    expect(await exists(join(dir, "src", "controllers", "auth", "google.ts"))).toBe(true);
    expect(await exists(join(dir, "src", "controllers", "auth", "google-callback.ts"))).toBe(true);

    // Facebook OAuth files (not enabled)
    expect(await exists(join(dir, "src", "auth", "oauth", "facebook.ts"))).toBe(false);

    // Migrations
    expect(await exists(join(dir, "migrations", "001_create_users.ts"))).toBe(true);
    expect(await exists(join(dir, "migrations", "002_create_oauth_accounts.ts"))).toBe(true);
    expect(await exists(join(dir, "migrations", "003_create_refresh_tokens.ts"))).toBe(true);
  });

  it("skips migrations for mongodb auth", async () => {
    vi.mocked(select).mockResolvedValueOnce("mongodb");
    vi.mocked(confirm)
      .mockResolvedValueOnce(true)   // Enable authentication?
      .mockResolvedValueOnce(false)  // Enable Google login?
      .mockResolvedValueOnce(false)  // Enable Facebook login?
      .mockResolvedValueOnce(false); // Enable GitHub login?

    await init("mongo-auth-app");
    const dir = join(tmp, "mongo-auth-app");

    // Auth files should exist
    expect(await exists(join(dir, "src", "auth", "jwt.ts"))).toBe(true);
    expect(await exists(join(dir, "src", "models", "User.ts"))).toBe(true);

    // Migrations should NOT exist
    expect(await exists(join(dir, "migrations"))).toBe(false);
  });

  it("does not prompt for auth when database is none", async () => {
    vi.mocked(select).mockResolvedValueOnce("none");
    vi.mocked(confirm).mockClear();

    await init("no-db-no-auth");
    const dir = join(tmp, "no-db-no-auth");

    // confirm should not have been called (dir is empty so no "not empty" prompt)
    expect(confirm).not.toHaveBeenCalled();

    // No auth files
    expect(await exists(join(dir, "src", "auth"))).toBe(false);
  });

  it("package.json includes jose when auth enabled", async () => {
    vi.mocked(select).mockResolvedValueOnce("sqlite");
    vi.mocked(confirm)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false);

    await init("jose-app");
    const content = await readFile(join(tmp, "jose-app", "package.json"), "utf-8");
    expect(content).toContain('"jose"');
  });

  it(".env includes JWT_SECRET when auth enabled", async () => {
    vi.mocked(select).mockResolvedValueOnce("sqlite");
    vi.mocked(confirm)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false);

    await init("jwt-env-app");
    const content = await readFile(join(tmp, "jwt-env-app", ".env"), "utf-8");
    expect(content).toContain("JWT_SECRET=");
    expect(content).toContain("JWT_ACCESS_EXPIRY=15m");
    expect(content).toContain("JWT_REFRESH_EXPIRY=7d");
  });

  it("app.tsx includes auth controllers when auth enabled", async () => {
    vi.mocked(select).mockResolvedValueOnce("sqlite");
    vi.mocked(confirm)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)   // Google
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false);

    await init("auth-app-tsx");
    const content = await readFile(join(tmp, "auth-app-tsx", "src", "app.tsx"), "utf-8");
    expect(content).toContain("Register");
    expect(content).toContain("Login");
    expect(content).toContain("GoogleAuth");
    expect(content).toContain("GoogleCallback");
    expect(content).toContain('path="/auth/register"');
  });

  // ── Storage integration tests ──

  it("app.tsx includes Storage wrapper when s3 selected", async () => {
    vi.mocked(select)
      .mockResolvedValueOnce("sqlite")
      .mockResolvedValueOnce("s3");
    await init("s3-app");
    const content = await readFile(join(tmp, "s3-app", "src", "app.tsx"), "utf-8");
    expect(content).toContain("<Storage");
    expect(content).toContain("Storage");
  });

  it("package.json includes AWS SDK deps when s3 selected", async () => {
    vi.mocked(select)
      .mockResolvedValueOnce("sqlite")
      .mockResolvedValueOnce("s3");
    await init("s3-pkg-app");
    const content = await readFile(join(tmp, "s3-pkg-app", "package.json"), "utf-8");
    expect(content).toContain('"@aws-sdk/client-s3"');
    expect(content).toContain('"@aws-sdk/s3-request-presigner"');
  });

  it(".env includes S3 vars when s3 selected", async () => {
    vi.mocked(select)
      .mockResolvedValueOnce("sqlite")
      .mockResolvedValueOnce("s3");
    await init("s3-env-app");
    const content = await readFile(join(tmp, "s3-env-app", ".env"), "utf-8");
    expect(content).toContain("S3_BUCKET=");
    expect(content).toContain("S3_REGION=");
    expect(content).toContain("S3_ENDPOINT=");
    expect(content).toContain("AWS_ACCESS_KEY_ID=");
    expect(content).toContain("AWS_SECRET_ACCESS_KEY=");
  });

  it("app.tsx omits Storage when none selected", async () => {
    vi.mocked(select)
      .mockResolvedValueOnce("sqlite")
      .mockResolvedValueOnce("none");
    await init("no-storage-app");
    const content = await readFile(join(tmp, "no-storage-app", "src", "app.tsx"), "utf-8");
    expect(content).not.toContain("Storage");
  });

  // ── GCS integration tests ──

  it("app.tsx includes Storage wrapper when gcs selected", async () => {
    vi.mocked(select)
      .mockResolvedValueOnce("sqlite")
      .mockResolvedValueOnce("gcs");
    await init("gcs-app");
    const content = await readFile(join(tmp, "gcs-app", "src", "app.tsx"), "utf-8");
    expect(content).toContain("<Storage");
    expect(content).toContain("Storage");
  });

  it("package.json includes GCS SDK dep when gcs selected", async () => {
    vi.mocked(select)
      .mockResolvedValueOnce("sqlite")
      .mockResolvedValueOnce("gcs");
    await init("gcs-pkg-app");
    const content = await readFile(join(tmp, "gcs-pkg-app", "package.json"), "utf-8");
    expect(content).toContain('"@google-cloud/storage"');
  });

  it(".env includes GCS vars when gcs selected", async () => {
    vi.mocked(select)
      .mockResolvedValueOnce("sqlite")
      .mockResolvedValueOnce("gcs");
    await init("gcs-env-app");
    const content = await readFile(join(tmp, "gcs-env-app", ".env"), "utf-8");
    expect(content).toContain("GCS_BUCKET=");
    expect(content).toContain("GCS_PROJECT_ID=");
    expect(content).toContain("GOOGLE_APPLICATION_CREDENTIALS=");
  });

  // ── Azure integration tests ──

  it("app.tsx includes Storage wrapper when azure selected", async () => {
    vi.mocked(select)
      .mockResolvedValueOnce("sqlite")
      .mockResolvedValueOnce("azure");
    await init("azure-app");
    const content = await readFile(join(tmp, "azure-app", "src", "app.tsx"), "utf-8");
    expect(content).toContain("<Storage");
    expect(content).toContain("Storage");
  });

  it("package.json includes Azure SDK dep when azure selected", async () => {
    vi.mocked(select)
      .mockResolvedValueOnce("sqlite")
      .mockResolvedValueOnce("azure");
    await init("azure-pkg-app");
    const content = await readFile(join(tmp, "azure-pkg-app", "package.json"), "utf-8");
    expect(content).toContain('"@azure/storage-blob"');
  });

  it(".env includes Azure vars when azure selected", async () => {
    vi.mocked(select)
      .mockResolvedValueOnce("sqlite")
      .mockResolvedValueOnce("azure");
    await init("azure-env-app");
    const content = await readFile(join(tmp, "azure-env-app", ".env"), "utf-8");
    expect(content).toContain("AZURE_STORAGE_CONTAINER=");
    expect(content).toContain("AZURE_STORAGE_CONNECTION_STRING=");
  });

  // ── Cache integration tests ──

  it("app.tsx includes Cache when memory cache selected", async () => {
    vi.mocked(select)
      .mockResolvedValueOnce("sqlite")    // database
      .mockResolvedValueOnce("none")      // storage
      .mockResolvedValueOnce("memory");   // cache
    await init("cache-mem-app");
    const content = await readFile(join(tmp, "cache-mem-app", "src", "app.tsx"), "utf-8");
    expect(content).toContain("<Cache");
    expect(content).toContain('driver="memory"');
  });

  it("app.tsx includes Cache when redis cache selected", async () => {
    vi.mocked(select)
      .mockResolvedValueOnce("sqlite")    // database
      .mockResolvedValueOnce("none")      // storage
      .mockResolvedValueOnce("redis");    // cache
    await init("cache-redis-app");
    const content = await readFile(join(tmp, "cache-redis-app", "src", "app.tsx"), "utf-8");
    expect(content).toContain("<Cache");
    expect(content).toContain('driver="redis"');
  });

  it("package.json includes ioredis when redis cache selected", async () => {
    vi.mocked(select)
      .mockResolvedValueOnce("sqlite")    // database
      .mockResolvedValueOnce("none")      // storage
      .mockResolvedValueOnce("redis");    // cache
    await init("cache-redis-pkg-app");
    const content = await readFile(join(tmp, "cache-redis-pkg-app", "package.json"), "utf-8");
    expect(content).toContain('"ioredis"');
  });

  it(".env includes REDIS_URL when redis cache selected", async () => {
    vi.mocked(select)
      .mockResolvedValueOnce("sqlite")    // database
      .mockResolvedValueOnce("none")      // storage
      .mockResolvedValueOnce("redis");    // cache
    await init("cache-redis-env-app");
    const content = await readFile(join(tmp, "cache-redis-env-app", ".env"), "utf-8");
    expect(content).toContain("REDIS_URL=redis://localhost:6379");
  });

  it("app.tsx omits Cache when none cache selected", async () => {
    vi.mocked(select)
      .mockResolvedValueOnce("sqlite")    // database
      .mockResolvedValueOnce("none")      // storage
      .mockResolvedValueOnce("none");     // cache
    await init("no-cache-app");
    const content = await readFile(join(tmp, "no-cache-app", "src", "app.tsx"), "utf-8");
    expect(content).not.toContain("Cache");
  });
});

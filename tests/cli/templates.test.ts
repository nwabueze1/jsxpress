import { describe, it, expect } from "vitest";
import { controllerTemplate } from "../../src/cli/templates/controller.js";
import { modelTemplate } from "../../src/cli/templates/model.js";
import { middlewareTemplate } from "../../src/cli/templates/middleware.js";
import { migrationTemplate } from "../../src/cli/templates/migration.js";
import {
  appTemplate,
  homeControllerTemplate,
  packageJsonTemplate,
  tsconfigTemplate,
  envTemplate,
  gitignoreTemplate,
} from "../../src/cli/templates/project.js";
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
  userRepositoryTemplate,
  oauthAccountRepositoryTemplate,
  refreshTokenRepositoryTemplate,
} from "../../src/cli/templates/auth.js";

describe("controllerTemplate", () => {
  it("generates correct class and name", () => {
    const result = controllerTemplate("users");
    expect(result).toContain("class Users extends Controller");
    expect(result).toContain('name = "users"');
    expect(result).toContain('from "jsxserve"');
  });
});

describe("modelTemplate", () => {
  it("generates correct class, table, and fields", () => {
    const result = modelTemplate("Post", [
      { name: "title", type: "text" },
      { name: "views", type: "integer" },
    ]);
    expect(result).toContain("class Post extends Model");
    expect(result).toContain('static table = "posts"');
    expect(result).toContain("Field.serial().primaryKey()");
    expect(result).toContain("title: Field.text().notNull()");
    expect(result).toContain("views: Field.integer().notNull()");
    expect(result).toContain('from "jsxserve"');
  });
});

describe("middlewareTemplate", () => {
  it("generates correct class with handle method", () => {
    const result = middlewareTemplate("auth");
    expect(result).toContain("class Auth extends Middleware");
    expect(result).toContain("handle(req");
    expect(result).toContain("next()");
    expect(result).toContain("NextFunction");
  });
});

describe("migrationTemplate", () => {
  it("generates up and down functions", () => {
    const result = migrationTemplate();
    expect(result).toContain("up(schema");
    expect(result).toContain("down(schema");
    expect(result).toContain("Schema");
  });
});

describe("appTemplate", () => {
  it("includes Database when dialect is provided", () => {
    const result = appTemplate("sqlite");
    expect(result).toContain('<Database dialect="sqlite"');
    expect(result).toContain("import { App, Config, Database, v }");
  });

  it("omits Database when no dialect", () => {
    const result = appTemplate();
    expect(result).not.toContain("Database");
    expect(result).toContain("<App");
  });

  it("omits Database when dialect is none", () => {
    const result = appTemplate("none");
    expect(result).not.toContain("Database");
  });

  it("always includes Config and v imports", () => {
    const withDialect = appTemplate("sqlite");
    expect(withDialect).toContain("Config");
    expect(withDialect).toContain("v");

    const withoutDialect = appTemplate();
    expect(withoutDialect).toContain("Config");
    expect(withoutDialect).toContain("v");
  });

  it("wraps Database inside Config when dialect provided", () => {
    const result = appTemplate("sqlite");
    const configIdx = result.indexOf("<Config");
    const databaseIdx = result.indexOf("<Database");
    const configCloseIdx = result.indexOf("</Config>");
    expect(configIdx).toBeLessThan(databaseIdx);
    expect(databaseIdx).toBeLessThan(configCloseIdx);
  });

  it("includes auth controllers when auth enabled", () => {
    const result = appTemplate("sqlite", { enabled: true });
    expect(result).toContain("Register");
    expect(result).toContain("Login");
    expect(result).toContain("Refresh");
    expect(result).toContain("Logout");
    expect(result).toContain('path="/auth/register"');
    expect(result).toContain('path="/auth/login"');
    expect(result).toContain("JWT_SECRET: v.string()");
  });

  it("includes OAuth controllers when providers enabled", () => {
    const result = appTemplate("sqlite", {
      enabled: true,
      google: true,
      github: true,
    });
    expect(result).toContain("GoogleAuth");
    expect(result).toContain("GoogleCallback");
    expect(result).toContain("GithubAuth");
    expect(result).toContain("GithubCallback");
    expect(result).toContain('path="/auth/google"');
    expect(result).toContain('path="/auth/github/callback"');
    expect(result).not.toContain("FacebookAuth");
  });

  it("includes provider env vars in Config schema", () => {
    const result = appTemplate("sqlite", {
      enabled: true,
      google: true,
    });
    expect(result).toContain("GOOGLE_CLIENT_ID: v.string()");
    expect(result).toContain("GOOGLE_CLIENT_SECRET: v.string()");
    expect(result).toContain("GOOGLE_REDIRECT_URI: v.string()");
  });

  it("includes Storage wrapper when storage is s3 with database", () => {
    const result = appTemplate("sqlite", undefined, "s3");
    expect(result).toContain("<Storage>");
    expect(result).toContain("import { App, Config, Database, Storage, v }");
    expect(result).toContain("S3_BUCKET: v.string()");
    expect(result).toContain("S3_REGION: v.string()");
    expect(result).toContain("S3_ENDPOINT: v.string()");
    expect(result).toContain("AWS_ACCESS_KEY_ID: v.string()");
    expect(result).toContain("AWS_SECRET_ACCESS_KEY: v.string()");
  });

  it("includes Storage wrapper when storage is s3 without database", () => {
    const result = appTemplate(undefined, undefined, "s3");
    expect(result).toContain("<Storage>");
    expect(result).toContain("import { App, Config, Storage, v }");
    expect(result).not.toContain("Database");
    expect(result).toContain("S3_BUCKET: v.string()");
  });

  it("includes Storage wrapper when storage is gcs with database", () => {
    const result = appTemplate("sqlite", undefined, "gcs");
    expect(result).toContain("<Storage>");
    expect(result).toContain("import { App, Config, Database, Storage, v }");
    expect(result).toContain("GCS_BUCKET: v.string()");
    expect(result).toContain("GCS_PROJECT_ID: v.string()");
    expect(result).toContain("GOOGLE_APPLICATION_CREDENTIALS: v.string()");
  });

  it("includes Storage wrapper when storage is gcs without database", () => {
    const result = appTemplate(undefined, undefined, "gcs");
    expect(result).toContain("<Storage>");
    expect(result).toContain("import { App, Config, Storage, v }");
    expect(result).not.toContain("Database");
    expect(result).toContain("GCS_BUCKET: v.string()");
  });

  it("includes Storage wrapper when storage is azure with database", () => {
    const result = appTemplate("sqlite", undefined, "azure");
    expect(result).toContain("<Storage>");
    expect(result).toContain("import { App, Config, Database, Storage, v }");
    expect(result).toContain("AZURE_STORAGE_CONTAINER: v.string()");
    expect(result).toContain("AZURE_STORAGE_CONNECTION_STRING: v.string()");
  });

  it("includes Storage wrapper when storage is azure without database", () => {
    const result = appTemplate(undefined, undefined, "azure");
    expect(result).toContain("<Storage>");
    expect(result).toContain("import { App, Config, Storage, v }");
    expect(result).not.toContain("Database");
    expect(result).toContain("AZURE_STORAGE_CONTAINER: v.string()");
  });
});

describe("homeControllerTemplate", () => {
  it("generates a home controller", () => {
    const result = homeControllerTemplate();
    expect(result).toContain("class Home extends Controller");
    expect(result).toContain('name = "home"');
  });
});

describe("packageJsonTemplate", () => {
  it("includes db dependency for sqlite", () => {
    const result = packageJsonTemplate("my-app", "sqlite");
    expect(result).toContain('"better-sqlite3"');
    expect(result).toContain('"my-app"');
  });

  it("omits db dependency for none", () => {
    const result = packageJsonTemplate("my-app", "none");
    expect(result).not.toContain("better-sqlite3");
    expect(result).not.toContain('"pg"');
  });

  it("includes jose when auth enabled", () => {
    const result = packageJsonTemplate("my-app", "sqlite", true);
    expect(result).toContain('"jose"');
  });

  it("omits jose when auth not enabled", () => {
    const result = packageJsonTemplate("my-app", "sqlite");
    expect(result).not.toContain('"jose"');
  });

  it("includes AWS SDK deps when storage is s3", () => {
    const result = packageJsonTemplate("my-app", "sqlite", false, "s3");
    expect(result).toContain('"@aws-sdk/client-s3"');
    expect(result).toContain('"@aws-sdk/s3-request-presigner"');
  });

  it("includes GCS SDK dep when storage is gcs", () => {
    const result = packageJsonTemplate("my-app", "sqlite", false, "gcs");
    expect(result).toContain('"@google-cloud/storage"');
  });

  it("includes Azure SDK dep when storage is azure", () => {
    const result = packageJsonTemplate("my-app", "sqlite", false, "azure");
    expect(result).toContain('"@azure/storage-blob"');
  });

  it("includes migration scripts for SQL dialects", () => {
    const result = packageJsonTemplate("my-app", "sqlite");
    expect(result).toContain('"migrate"');
    expect(result).toContain('"migrate:down"');
    expect(result).toContain('"migrate:status"');
    expect(result).toContain('"migrate:generate"');
    expect(result).toContain('"migrate:diff"');
  });

  it("omits migration scripts for mongodb", () => {
    const result = packageJsonTemplate("my-app", "mongodb");
    expect(result).not.toContain('"migrate"');
    expect(result).not.toContain('"migrate:down"');
  });

  it("omits migration scripts when no dialect", () => {
    const result = packageJsonTemplate("my-app");
    expect(result).not.toContain('"migrate"');
  });

  it("omits migration scripts for none dialect", () => {
    const result = packageJsonTemplate("my-app", "none");
    expect(result).not.toContain('"migrate"');
  });
});

describe("tsconfigTemplate", () => {
  it("includes jsx settings", () => {
    const result = tsconfigTemplate();
    expect(result).toContain('"react-jsx"');
    expect(result).toContain('"jsxserve"');
  });
});

describe("envTemplate", () => {
  it("contains PORT=3000", () => {
    const result = envTemplate();
    expect(result).toContain("PORT=3000");
  });

  it("includes DATABASE_URL when dialect is provided", () => {
    const result = envTemplate("postgres");
    expect(result).toContain("DATABASE_URL=postgres://localhost:5432/myapp");
    expect(result).toContain("PORT=3000");
  });

  it("omits DATABASE_URL when no dialect", () => {
    const result = envTemplate();
    expect(result).not.toContain("DATABASE_URL");
  });

  it("omits DATABASE_URL when dialect is none", () => {
    const result = envTemplate("none");
    expect(result).not.toContain("DATABASE_URL");
  });

  it("includes S3 env vars when storage is s3", () => {
    const result = envTemplate("sqlite", undefined, "s3");
    expect(result).toContain("S3_BUCKET=my-bucket");
    expect(result).toContain("S3_REGION=us-east-1");
    expect(result).toContain("S3_ENDPOINT=");
    expect(result).toContain("AWS_ACCESS_KEY_ID=your-access-key-id");
    expect(result).toContain("AWS_SECRET_ACCESS_KEY=your-secret-access-key");
  });

  it("includes JWT_SECRET when auth enabled", () => {
    const result = envTemplate("sqlite", { enabled: true });
    expect(result).toContain("JWT_SECRET=");
    expect(result).toContain("JWT_ACCESS_EXPIRY=15m");
    expect(result).toContain("JWT_REFRESH_EXPIRY=7d");
  });

  it("includes Google OAuth env vars when google enabled", () => {
    const result = envTemplate("sqlite", { enabled: true, google: true });
    expect(result).toContain("GOOGLE_CLIENT_ID=");
    expect(result).toContain("GOOGLE_CLIENT_SECRET=");
    expect(result).toContain("GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback");
  });

  it("omits provider env vars when provider not enabled", () => {
    const result = envTemplate("sqlite", { enabled: true, google: false });
    expect(result).not.toContain("GOOGLE_CLIENT_ID");
  });

  it("generates a 64-char hex JWT_SECRET", () => {
    const result = envTemplate("sqlite", { enabled: true });
    const match = result.match(/JWT_SECRET=([a-f0-9]+)/);
    expect(match).not.toBeNull();
    expect(match![1]).toHaveLength(64);
  });

  it("includes GCS env vars when storage is gcs", () => {
    const result = envTemplate("sqlite", undefined, "gcs");
    expect(result).toContain("GCS_BUCKET=my-bucket");
    expect(result).toContain("GCS_PROJECT_ID=my-project");
    expect(result).toContain("GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json");
  });

  it("includes Azure env vars when storage is azure", () => {
    const result = envTemplate("sqlite", undefined, "azure");
    expect(result).toContain("AZURE_STORAGE_CONTAINER=my-container");
    expect(result).toContain("AZURE_STORAGE_CONNECTION_STRING=");
  });
});

describe("gitignoreTemplate", () => {
  it("includes common entries", () => {
    const result = gitignoreTemplate();
    expect(result).toContain("node_modules");
    expect(result).toContain("dist");
  });
});

// ── Cache template tests ──

describe("appTemplate with cache", () => {
  it("includes Cache wrapper when cache is memory with database", () => {
    const result = appTemplate("sqlite", undefined, undefined, "memory");
    expect(result).toContain("<Cache");
    expect(result).toContain('driver="memory"');
    expect(result).toContain("Cache");
  });

  it("includes Cache wrapper when cache is redis with database", () => {
    const result = appTemplate("sqlite", undefined, undefined, "redis");
    expect(result).toContain("<Cache");
    expect(result).toContain('driver="redis"');
    expect(result).toContain("REDIS_URL: v.string()");
  });

  it("includes Cache wrapper when cache is memory without database", () => {
    const result = appTemplate(undefined, undefined, undefined, "memory");
    expect(result).toContain("<Cache");
    expect(result).toContain("Cache");
    expect(result).not.toContain("Database");
  });

  it("includes Cache wrapper when cache is redis without database", () => {
    const result = appTemplate(undefined, undefined, undefined, "redis");
    expect(result).toContain("<Cache");
    expect(result).toContain("REDIS_URL: v.string()");
    expect(result).not.toContain("Database");
  });

  it("omits Cache when cache is none", () => {
    const result = appTemplate("sqlite", undefined, undefined, "none");
    expect(result).not.toContain("Cache");
  });

  it("omits Cache when cache is undefined", () => {
    const result = appTemplate("sqlite");
    expect(result).not.toContain("Cache");
  });

  it("nests Storage > Cache > controllers when both enabled", () => {
    const result = appTemplate("sqlite", undefined, "s3", "memory");
    expect(result).toContain("<Storage>");
    expect(result).toContain("<Cache");
    const storageIdx = result.indexOf("<Storage>");
    const cacheIdx = result.indexOf("<Cache");
    const cacheCloseIdx = result.indexOf("</Cache>");
    const storageCloseIdx = result.indexOf("</Storage>");
    expect(storageIdx).toBeLessThan(cacheIdx);
    expect(cacheCloseIdx).toBeLessThan(storageCloseIdx);
  });
});

describe("packageJsonTemplate with cache", () => {
  it("includes ioredis when cache is redis", () => {
    const result = packageJsonTemplate("my-app", "sqlite", false, undefined, "redis");
    expect(result).toContain('"ioredis"');
  });

  it("omits ioredis when cache is memory", () => {
    const result = packageJsonTemplate("my-app", "sqlite", false, undefined, "memory");
    expect(result).not.toContain('"ioredis"');
  });

  it("omits ioredis when cache is none", () => {
    const result = packageJsonTemplate("my-app", "sqlite", false, undefined, "none");
    expect(result).not.toContain('"ioredis"');
  });
});

describe("envTemplate with cache", () => {
  it("includes REDIS_URL when cache is redis", () => {
    const result = envTemplate("sqlite", undefined, undefined, "redis");
    expect(result).toContain("REDIS_URL=redis://localhost:6379");
  });

  it("omits REDIS_URL when cache is memory", () => {
    const result = envTemplate("sqlite", undefined, undefined, "memory");
    expect(result).not.toContain("REDIS_URL");
  });

  it("omits REDIS_URL when cache is none", () => {
    const result = envTemplate("sqlite", undefined, undefined, "none");
    expect(result).not.toContain("REDIS_URL");
  });
});

// ── Auth template tests ──

describe("authJwtTemplate", () => {
  it("imports from jose", () => {
    const result = authJwtTemplate();
    expect(result).toContain('from "jose"');
  });

  it("exports signAccessToken, signRefreshToken, verifyAccessToken", () => {
    const result = authJwtTemplate();
    expect(result).toContain("async function signAccessToken");
    expect(result).toContain("async function signRefreshToken");
    expect(result).toContain("async function verifyAccessToken");
  });

  it("reads JWT_SECRET from process.env", () => {
    const result = authJwtTemplate();
    expect(result).toContain("process.env.JWT_SECRET");
  });
});

describe("authPasswordTemplate", () => {
  it("uses crypto.scrypt", () => {
    const result = authPasswordTemplate();
    expect(result).toContain('from "node:crypto"');
    expect(result).toContain("scrypt");
  });

  it("exports hashPassword and verifyPassword", () => {
    const result = authPasswordTemplate();
    expect(result).toContain("async function hashPassword");
    expect(result).toContain("async function verifyPassword");
  });

  it("uses timingSafeEqual for comparison", () => {
    const result = authPasswordTemplate();
    expect(result).toContain("timingSafeEqual");
  });
});

describe("authOAuthUtilTemplate", () => {
  it("generates Google OAuth util with correct URLs", () => {
    const result = authOAuthUtilTemplate("google");
    expect(result).toContain("getGoogleAuthUrl");
    expect(result).toContain("getGoogleUser");
    expect(result).toContain("accounts.google.com/o/oauth2/v2/auth");
    expect(result).toContain("oauth2.googleapis.com/token");
    expect(result).toContain("GOOGLE_CLIENT_ID");
  });

  it("generates Facebook OAuth util with correct URLs", () => {
    const result = authOAuthUtilTemplate("facebook");
    expect(result).toContain("getFacebookAuthUrl");
    expect(result).toContain("getFacebookUser");
    expect(result).toContain("facebook.com/v18.0/dialog/oauth");
    expect(result).toContain("FACEBOOK_CLIENT_ID");
  });

  it("generates GitHub OAuth util with correct URLs", () => {
    const result = authOAuthUtilTemplate("github");
    expect(result).toContain("getGithubAuthUrl");
    expect(result).toContain("getGithubUser");
    expect(result).toContain("github.com/login/oauth/authorize");
    expect(result).toContain("api.github.com/user");
    expect(result).toContain("GITHUB_CLIENT_ID");
  });
});

describe("userModelTemplate", () => {
  it("generates User model with correct fields", () => {
    const result = userModelTemplate();
    expect(result).toContain("class User extends Model");
    expect(result).toContain('static table = "users"');
    expect(result).toContain("email: Field.text().notNull()");
    expect(result).toContain("password_hash: Field.text()");
    expect(result).toContain("name: Field.text().notNull()");
    expect(result).toContain("created_at: Field.text().notNull()");
  });

  it("makes password_hash nullable for OAuth-only users", () => {
    const result = userModelTemplate();
    expect(result).toContain("password_hash: Field.text(),");
    expect(result).not.toContain("password_hash: Field.text().notNull()");
  });
});

describe("oauthAccountModelTemplate", () => {
  it("generates OAuthAccount model with correct fields", () => {
    const result = oauthAccountModelTemplate();
    expect(result).toContain("class OAuthAccount extends Model");
    expect(result).toContain('static table = "oauth_accounts"');
    expect(result).toContain("user_id: Field.integer().notNull()");
    expect(result).toContain("provider: Field.text().notNull()");
    expect(result).toContain("provider_user_id: Field.text().notNull()");
  });
});

describe("refreshTokenModelTemplate", () => {
  it("generates RefreshToken model with correct fields", () => {
    const result = refreshTokenModelTemplate();
    expect(result).toContain("class RefreshToken extends Model");
    expect(result).toContain('static table = "refresh_tokens"');
    expect(result).toContain("token: Field.text().notNull()");
    expect(result).toContain("expires_at: Field.text().notNull()");
  });
});

describe("userMigrationTemplate", () => {
  it("generates Schema-based migration with correct fields", () => {
    const result = userMigrationTemplate("sqlite");
    expect(result).toContain('schema.create("users"');
    expect(result).toContain('table.text("email").notNull().unique()');
    expect(result).toContain('table.text("password_hash")');
    expect(result).toContain('table.text("name").notNull()');
    expect(result).toContain('schema.dropIfExists("users")');
  });

  it("uses Schema type instead of DatabaseAdapter", () => {
    const result = userMigrationTemplate("postgres");
    expect(result).toContain("Schema");
    expect(result).not.toContain("DatabaseAdapter");
  });
});

describe("oauthAccountMigrationTemplate", () => {
  it("generates Schema-based migration with unique constraint", () => {
    const result = oauthAccountMigrationTemplate("sqlite");
    expect(result).toContain('schema.create("oauth_accounts"');
    expect(result).toContain('table.unique(["provider", "provider_user_id"])');
    expect(result).toContain('schema.dropIfExists("oauth_accounts")');
  });
});

describe("refreshTokenMigrationTemplate", () => {
  it("generates Schema-based migration with token unique", () => {
    const result = refreshTokenMigrationTemplate("sqlite");
    expect(result).toContain('schema.create("refresh_tokens"');
    expect(result).toContain('table.text("token").notNull().unique()');
    expect(result).toContain('schema.dropIfExists("refresh_tokens")');
  });
});

describe("authMiddlewareTemplate", () => {
  it("extends Middleware and verifies Bearer token", () => {
    const result = authMiddlewareTemplate();
    expect(result).toContain("class Auth extends Middleware");
    expect(result).toContain("Bearer");
    expect(result).toContain("verifyAccessToken");
    expect(result).toContain("userId");
  });

  it("imports from jwt module", () => {
    const result = authMiddlewareTemplate();
    expect(result).toContain('from "@/auth/jwt.js"');
  });
});

describe("authRegisterControllerTemplate", () => {
  it("extends Controller with validation schema", () => {
    const result = authRegisterControllerTemplate();
    expect(result).toContain("class Register extends Controller");
    expect(result).toContain("v.string().email()");
    expect(result).toContain("v.string().min(8)");
    expect(result).toContain("v.string().min(1)");
  });

  it("uses ControllerSchema format with post.body", () => {
    const result = authRegisterControllerTemplate();
    expect(result).toContain("post: {");
    expect(result).toContain("body: v.object(");
  });

  it("uses this.repo() for database operations", () => {
    const result = authRegisterControllerTemplate();
    expect(result).toContain("this.repo(UserRepository)");
    expect(result).toContain("this.repo(RefreshTokenRepository)");
  });

  it("imports repositories instead of models", () => {
    const result = authRegisterControllerTemplate();
    expect(result).toContain('from "@/repositories/UserRepository.js"');
    expect(result).toContain('from "@/repositories/RefreshTokenRepository.js"');
  });

  it("imports password and jwt utilities", () => {
    const result = authRegisterControllerTemplate();
    expect(result).toContain('from "@/auth/password.js"');
    expect(result).toContain('from "@/auth/jwt.js"');
  });
});

describe("authLoginControllerTemplate", () => {
  it("extends Controller and verifies credentials", () => {
    const result = authLoginControllerTemplate();
    expect(result).toContain("class Login extends Controller");
    expect(result).toContain("verifyPassword");
    expect(result).toContain("Invalid credentials");
  });

  it("uses this.repo() for database operations", () => {
    const result = authLoginControllerTemplate();
    expect(result).toContain("this.repo(UserRepository)");
    expect(result).toContain("this.repo(RefreshTokenRepository)");
  });
});

describe("authRefreshControllerTemplate", () => {
  it("implements token rotation", () => {
    const result = authRefreshControllerTemplate();
    expect(result).toContain("class Refresh extends Controller");
    expect(result).toContain("Token rotation");
    expect(result).toContain("signAccessToken");
    expect(result).toContain("signRefreshToken");
  });

  it("uses this.repo() for database operations", () => {
    const result = authRefreshControllerTemplate();
    expect(result).toContain("this.repo(RefreshTokenRepository)");
  });
});

describe("authLogoutControllerTemplate", () => {
  it("deletes refresh token and returns noContent", () => {
    const result = authLogoutControllerTemplate();
    expect(result).toContain("class Logout extends Controller");
    expect(result).toContain("Res.noContent()");
  });

  it("uses this.repo() for database operations", () => {
    const result = authLogoutControllerTemplate();
    expect(result).toContain("this.repo(RefreshTokenRepository)");
  });
});

describe("authOAuthControllerTemplate", () => {
  it("generates redirect controller for google", () => {
    const result = authOAuthControllerTemplate("google");
    expect(result).toContain("class GoogleAuth extends Controller");
    expect(result).toContain("getGoogleAuthUrl");
    expect(result).toContain("Res.redirect");
    expect(result).toContain('from "@/auth/oauth/google.js"');
  });

  it("generates redirect controller for github", () => {
    const result = authOAuthControllerTemplate("github");
    expect(result).toContain("class GithubAuth extends Controller");
    expect(result).toContain("getGithubAuthUrl");
  });
});

describe("authOAuthCallbackControllerTemplate", () => {
  it("generates callback controller that exchanges code", () => {
    const result = authOAuthCallbackControllerTemplate("google");
    expect(result).toContain("class GoogleCallback extends Controller");
    expect(result).toContain("getGoogleUser");
    expect(result).toContain('provider: "google"');
    expect(result).toContain("OAuthAccountRepository");
    expect(result).toContain("signAccessToken");
  });

  it("uses this.repo() for database operations", () => {
    const result = authOAuthCallbackControllerTemplate("google");
    expect(result).toContain("this.repo(UserRepository)");
    expect(result).toContain("this.repo(OAuthAccountRepository)");
    expect(result).toContain("this.repo(RefreshTokenRepository)");
  });

  it("handles missing code parameter", () => {
    const result = authOAuthCallbackControllerTemplate("google");
    expect(result).toContain("Missing code parameter");
    expect(result).toContain(", 400)");
  });

  it("uses req.query to get code parameter", () => {
    const result = authOAuthCallbackControllerTemplate("google");
    expect(result).toContain('req.query.get("code")');
  });
});

// ── Repository template tests ──

describe("userRepositoryTemplate", () => {
  it("extends Repository and imports User model", () => {
    const result = userRepositoryTemplate();
    expect(result).toContain("class UserRepository extends Repository");
    expect(result).toContain('from "jsxserve"');
    expect(result).toContain('from "@/models/User.js"');
  });

  it("has findByEmail, findById, and create methods", () => {
    const result = userRepositoryTemplate();
    expect(result).toContain("async findByEmail(email: string)");
    expect(result).toContain("async findById(id: number)");
    expect(result).toContain("async create(data:");
  });

  it("uses User.query(this.db) internally", () => {
    const result = userRepositoryTemplate();
    expect(result).toContain("User.query(this.db)");
  });
});

describe("oauthAccountRepositoryTemplate", () => {
  it("extends Repository and imports OAuthAccount model", () => {
    const result = oauthAccountRepositoryTemplate();
    expect(result).toContain("class OAuthAccountRepository extends Repository");
    expect(result).toContain('from "jsxserve"');
    expect(result).toContain('from "@/models/OAuthAccount.js"');
  });

  it("has findByProvider and create methods", () => {
    const result = oauthAccountRepositoryTemplate();
    expect(result).toContain("async findByProvider(provider: string");
    expect(result).toContain("async create(data:");
  });
});

describe("refreshTokenRepositoryTemplate", () => {
  it("extends Repository and imports RefreshToken model", () => {
    const result = refreshTokenRepositoryTemplate();
    expect(result).toContain("class RefreshTokenRepository extends Repository");
    expect(result).toContain('from "jsxserve"');
    expect(result).toContain('from "@/models/RefreshToken.js"');
  });

  it("has create, findByToken, deleteByToken, and deleteAllForUser methods", () => {
    const result = refreshTokenRepositoryTemplate();
    expect(result).toContain("async create(");
    expect(result).toContain("async findByToken(token: string)");
    expect(result).toContain("async deleteByToken(token: string)");
    expect(result).toContain("async deleteAllForUser(userId:");
  });
});

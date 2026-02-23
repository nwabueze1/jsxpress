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
    expect(result).toContain("up(adapter");
    expect(result).toContain("down(adapter");
    expect(result).toContain("DatabaseAdapter");
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
});

describe("gitignoreTemplate", () => {
  it("includes common entries", () => {
    const result = gitignoreTemplate();
    expect(result).toContain("node_modules");
    expect(result).toContain("dist");
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
  it("generates sqlite migration with AUTOINCREMENT", () => {
    const result = userMigrationTemplate("sqlite");
    expect(result).toContain("CREATE TABLE IF NOT EXISTS users");
    expect(result).toContain("AUTOINCREMENT");
    expect(result).toContain("email TEXT NOT NULL UNIQUE");
    expect(result).toContain("password_hash TEXT");
    expect(result).toContain("DROP TABLE IF EXISTS users");
  });

  it("generates postgres migration with SERIAL", () => {
    const result = userMigrationTemplate("postgres");
    expect(result).toContain("SERIAL PRIMARY KEY");
    expect(result).not.toContain("AUTOINCREMENT");
  });
});

describe("oauthAccountMigrationTemplate", () => {
  it("generates migration with unique constraint", () => {
    const result = oauthAccountMigrationTemplate("sqlite");
    expect(result).toContain("CREATE TABLE IF NOT EXISTS oauth_accounts");
    expect(result).toContain("UNIQUE(provider, provider_user_id)");
    expect(result).toContain("DROP TABLE IF EXISTS oauth_accounts");
  });
});

describe("refreshTokenMigrationTemplate", () => {
  it("generates migration with token unique constraint", () => {
    const result = refreshTokenMigrationTemplate("sqlite");
    expect(result).toContain("CREATE TABLE IF NOT EXISTS refresh_tokens");
    expect(result).toContain("token TEXT NOT NULL UNIQUE");
    expect(result).toContain("DROP TABLE IF EXISTS refresh_tokens");
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
  it("extends DatabaseController with validation schema", () => {
    const result = authRegisterControllerTemplate();
    expect(result).toContain("class Register extends DatabaseController");
    expect(result).toContain("v.string().email()");
    expect(result).toContain("v.string().min(8)");
    expect(result).toContain("v.string().min(1)");
  });

  it("uses ControllerSchema format with post.body", () => {
    const result = authRegisterControllerTemplate();
    expect(result).toContain("post: {");
    expect(result).toContain("body: v.object(");
  });

  it("uses Model.query(this.db) for database operations", () => {
    const result = authRegisterControllerTemplate();
    expect(result).toContain("User.query(this.db)");
    expect(result).toContain("RefreshToken.query(this.db)");
  });

  it("imports password and jwt utilities", () => {
    const result = authRegisterControllerTemplate();
    expect(result).toContain('from "@/auth/password.js"');
    expect(result).toContain('from "@/auth/jwt.js"');
  });
});

describe("authLoginControllerTemplate", () => {
  it("extends DatabaseController and verifies credentials", () => {
    const result = authLoginControllerTemplate();
    expect(result).toContain("class Login extends DatabaseController");
    expect(result).toContain("verifyPassword");
    expect(result).toContain("Invalid credentials");
  });
});

describe("authRefreshControllerTemplate", () => {
  it("implements token rotation", () => {
    const result = authRefreshControllerTemplate();
    expect(result).toContain("class Refresh extends DatabaseController");
    expect(result).toContain("Token rotation");
    expect(result).toContain("signAccessToken");
    expect(result).toContain("signRefreshToken");
  });
});

describe("authLogoutControllerTemplate", () => {
  it("deletes refresh token and returns noContent", () => {
    const result = authLogoutControllerTemplate();
    expect(result).toContain("class Logout extends DatabaseController");
    expect(result).toContain("Res.noContent()");
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
    expect(result).toContain("class GoogleCallback extends DatabaseController");
    expect(result).toContain("getGoogleUser");
    expect(result).toContain('provider: "google"');
    expect(result).toContain("OAuthAccount");
    expect(result).toContain("signAccessToken");
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

export function authJwtTemplate(): string {
  return `import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);
const accessExpiry = process.env.JWT_ACCESS_EXPIRY || "15m";
const refreshExpiry = process.env.JWT_REFRESH_EXPIRY || "7d";

export async function signAccessToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(accessExpiry)
    .sign(secret);
}

export async function signRefreshToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(refreshExpiry)
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, secret);
  return payload.sub as string;
}
`;
}

export function authPasswordTemplate(): string {
  return `import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return salt + ":" + buf.toString("hex");
}

export async function verifyPassword(
  stored: string,
  supplied: string,
): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  const buf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(Buffer.from(hash, "hex"), buf);
}
`;
}

const oauthConfigs: Record<
  string,
  {
    authUrl: string;
    tokenUrl: string;
    userInfoUrl: string;
    scopes: string;
    envPrefix: string;
  }
> = {
  google: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userInfoUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
    scopes: "openid email profile",
    envPrefix: "GOOGLE",
  },
  facebook: {
    authUrl: "https://www.facebook.com/v18.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token",
    userInfoUrl: "https://graph.facebook.com/me?fields=id,email,name",
    scopes: "email",
    envPrefix: "FACEBOOK",
  },
  github: {
    authUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    userInfoUrl: "https://api.github.com/user",
    scopes: "user:email",
    envPrefix: "GITHUB",
  },
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function authOAuthUtilTemplate(provider: string): string {
  const config = oauthConfigs[provider];
  const name = capitalize(provider);

  return `const clientId = process.env.${config.envPrefix}_CLIENT_ID!;
const clientSecret = process.env.${config.envPrefix}_CLIENT_SECRET!;
const redirectUri = process.env.${config.envPrefix}_REDIRECT_URI!;

export function get${name}AuthUrl(): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "${config.scopes}",
  });
  return "${config.authUrl}?" + params.toString();
}

export async function get${name}User(
  code: string,
): Promise<{ id: string; email: string; name: string }> {
  const tokenRes = await fetch("${config.tokenUrl}", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const tokens = await tokenRes.json();

  const userRes = await fetch("${config.userInfoUrl}", {
    headers: { Authorization: \`Bearer \${tokens.access_token}\` },
  });
  const user = await userRes.json();

  return {
    id: String(user.id ?? user.sub),
    email: user.email,
    name: user.name ?? user.login ?? "",
  };
}
`;
}

export function userModelTemplate(): string {
  return `import { Model, Field } from "jsxserve";

export class User extends Model {
  static table = "users";

  static schema = {
    id: Field.serial().primaryKey(),
    email: Field.text().notNull(),
    password_hash: Field.text(),
    name: Field.text().notNull(),
    created_at: Field.text().notNull(),
  };
}
`;
}

export function oauthAccountModelTemplate(): string {
  return `import { Model, Field } from "jsxserve";

export class OAuthAccount extends Model {
  static table = "oauth_accounts";

  static schema = {
    id: Field.serial().primaryKey(),
    user_id: Field.integer().notNull(),
    provider: Field.text().notNull(),
    provider_user_id: Field.text().notNull(),
    email: Field.text().notNull(),
  };
}
`;
}

export function refreshTokenModelTemplate(): string {
  return `import { Model, Field } from "jsxserve";

export class RefreshToken extends Model {
  static table = "refresh_tokens";

  static schema = {
    id: Field.serial().primaryKey(),
    user_id: Field.integer().notNull(),
    token: Field.text().notNull(),
    expires_at: Field.text().notNull(),
  };
}
`;
}

function sqlTypes(dialect: string) {
  const isPostgres = dialect === "postgres";
  return {
    serial: isPostgres ? "SERIAL" : "INTEGER",
    autoIncrement: isPostgres ? "" : " AUTOINCREMENT",
    primaryKey: isPostgres ? " PRIMARY KEY" : " PRIMARY KEY",
    timestamp: isPostgres ? "TIMESTAMP DEFAULT NOW()" : "TEXT DEFAULT (datetime('now'))",
    text: "TEXT",
    integer: "INTEGER",
  };
}

export function userMigrationTemplate(dialect: string): string {
  const t = sqlTypes(dialect);
  const pk = dialect === "postgres"
    ? `id ${t.serial} PRIMARY KEY`
    : `id INTEGER PRIMARY KEY AUTOINCREMENT`;

  return `import type { DatabaseAdapter } from "jsxserve";

export async function up(adapter: DatabaseAdapter): Promise<void> {
  await adapter.raw(\`
    CREATE TABLE IF NOT EXISTS users (
      ${pk},
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      name TEXT NOT NULL,
      created_at ${t.timestamp}
    )
  \`);
}

export async function down(adapter: DatabaseAdapter): Promise<void> {
  await adapter.raw("DROP TABLE IF EXISTS users");
}
`;
}

export function oauthAccountMigrationTemplate(dialect: string): string {
  const pk = dialect === "postgres"
    ? "id SERIAL PRIMARY KEY"
    : "id INTEGER PRIMARY KEY AUTOINCREMENT";

  return `import type { DatabaseAdapter } from "jsxserve";

export async function up(adapter: DatabaseAdapter): Promise<void> {
  await adapter.raw(\`
    CREATE TABLE IF NOT EXISTS oauth_accounts (
      ${pk},
      user_id INTEGER NOT NULL,
      provider TEXT NOT NULL,
      provider_user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      UNIQUE(provider, provider_user_id)
    )
  \`);
}

export async function down(adapter: DatabaseAdapter): Promise<void> {
  await adapter.raw("DROP TABLE IF EXISTS oauth_accounts");
}
`;
}

export function refreshTokenMigrationTemplate(dialect: string): string {
  const pk = dialect === "postgres"
    ? "id SERIAL PRIMARY KEY"
    : "id INTEGER PRIMARY KEY AUTOINCREMENT";

  return `import type { DatabaseAdapter } from "jsxserve";

export async function up(adapter: DatabaseAdapter): Promise<void> {
  await adapter.raw(\`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      ${pk},
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL
    )
  \`);
}

export async function down(adapter: DatabaseAdapter): Promise<void> {
  await adapter.raw("DROP TABLE IF EXISTS refresh_tokens");
}
`;
}

export function authMiddlewareTemplate(): string {
  return `import { Middleware, type JsxpressRequest, type NextFunction } from "jsxserve";
import { Res } from "jsxserve";
import { verifyAccessToken } from "@/auth/jwt.js";

export class Auth extends Middleware {
  async handle(req: JsxpressRequest, next: NextFunction): Promise<Response> {
    const header = req.headers.get("authorization");
    if (!header || !header.startsWith("Bearer ")) {
      return Res.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const token = header.slice(7);
      const userId = await verifyAccessToken(token);
      (req as any).userId = userId;
      return next();
    } catch {
      return Res.json({ error: "Invalid token" }, { status: 401 });
    }
  }
}
`;
}

export function authRegisterControllerTemplate(): string {
  return `import { DatabaseController, type JsxpressRequest } from "jsxserve";
import { Res, v } from "jsxserve";
import { hashPassword } from "@/auth/password.js";
import { signAccessToken, signRefreshToken } from "@/auth/jwt.js";
import { User } from "@/models/User.js";
import { RefreshToken } from "@/models/RefreshToken.js";

export class Register extends DatabaseController {
  name = "register";

  schema = v.object({
    email: v.string().email(),
    password: v.string().min(8),
    name: v.string().min(1),
  });

  async post(req: JsxpressRequest) {
    const body = await this.validate(req);

    const existing = await this.db.findOne(User, { email: body.email });
    if (existing) {
      return Res.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await hashPassword(body.password);
    const user = await this.db.create(User, {
      email: body.email,
      password_hash: passwordHash,
      name: body.name,
      created_at: new Date().toISOString(),
    });

    const accessToken = await signAccessToken(String(user.id));
    const refreshToken = await signRefreshToken(String(user.id));

    await this.db.create(RefreshToken, {
      user_id: user.id,
      token: refreshToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    return Res.json({ accessToken, refreshToken }, { status: 201 });
  }
}
`;
}

export function authLoginControllerTemplate(): string {
  return `import { DatabaseController, type JsxpressRequest } from "jsxserve";
import { Res, v } from "jsxserve";
import { verifyPassword } from "@/auth/password.js";
import { signAccessToken, signRefreshToken } from "@/auth/jwt.js";
import { User } from "@/models/User.js";
import { RefreshToken } from "@/models/RefreshToken.js";

export class Login extends DatabaseController {
  name = "login";

  schema = v.object({
    email: v.string().email(),
    password: v.string().min(1),
  });

  async post(req: JsxpressRequest) {
    const body = await this.validate(req);

    const user = await this.db.findOne(User, { email: body.email });
    if (!user || !user.password_hash) {
      return Res.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await verifyPassword(user.password_hash as string, body.password);
    if (!valid) {
      return Res.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const accessToken = await signAccessToken(String(user.id));
    const refreshToken = await signRefreshToken(String(user.id));

    await this.db.create(RefreshToken, {
      user_id: user.id,
      token: refreshToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    return Res.json({ accessToken, refreshToken });
  }
}
`;
}

export function authRefreshControllerTemplate(): string {
  return `import { DatabaseController, type JsxpressRequest } from "jsxserve";
import { Res, v } from "jsxserve";
import { signAccessToken, signRefreshToken } from "@/auth/jwt.js";
import { RefreshToken } from "@/models/RefreshToken.js";

export class Refresh extends DatabaseController {
  name = "refresh";

  schema = v.object({
    refreshToken: v.string().min(1),
  });

  async post(req: JsxpressRequest) {
    const body = await this.validate(req);

    const stored = await this.db.findOne(RefreshToken, { token: body.refreshToken });
    if (!stored) {
      return Res.json({ error: "Invalid refresh token" }, { status: 401 });
    }

    if (new Date(stored.expires_at as string) < new Date()) {
      await this.db.delete(RefreshToken, { id: stored.id });
      return Res.json({ error: "Refresh token expired" }, { status: 401 });
    }

    // Token rotation: delete old, issue new pair
    await this.db.delete(RefreshToken, { id: stored.id });

    const userId = String(stored.user_id);
    const accessToken = await signAccessToken(userId);
    const refreshToken = await signRefreshToken(userId);

    await this.db.create(RefreshToken, {
      user_id: stored.user_id,
      token: refreshToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    return Res.json({ accessToken, refreshToken });
  }
}
`;
}

export function authLogoutControllerTemplate(): string {
  return `import { DatabaseController, type JsxpressRequest } from "jsxserve";
import { Res, v } from "jsxserve";
import { RefreshToken } from "@/models/RefreshToken.js";

export class Logout extends DatabaseController {
  name = "logout";

  schema = v.object({
    refreshToken: v.string().min(1),
  });

  async post(req: JsxpressRequest) {
    const body = await this.validate(req);
    await this.db.delete(RefreshToken, { token: body.refreshToken });
    return Res.noContent();
  }
}
`;
}

export function authOAuthControllerTemplate(provider: string): string {
  const name = capitalize(provider);

  return `import { Controller, type JsxpressRequest } from "jsxserve";
import { Res } from "jsxserve";
import { get${name}AuthUrl } from "@/auth/oauth/${provider}.js";

export class ${name}Auth extends Controller {
  name = "${provider}-auth";

  get(req: JsxpressRequest) {
    return Res.redirect(get${name}AuthUrl());
  }
}
`;
}

export function authOAuthCallbackControllerTemplate(provider: string): string {
  const name = capitalize(provider);

  return `import { DatabaseController, type JsxpressRequest } from "jsxserve";
import { Res } from "jsxserve";
import { get${name}User } from "@/auth/oauth/${provider}.js";
import { signAccessToken, signRefreshToken } from "@/auth/jwt.js";
import { User } from "@/models/User.js";
import { OAuthAccount } from "@/models/OAuthAccount.js";
import { RefreshToken } from "@/models/RefreshToken.js";

export class ${name}Callback extends DatabaseController {
  name = "${provider}-callback";

  async get(req: JsxpressRequest) {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    if (!code) {
      return Res.json({ error: "Missing code parameter" }, { status: 400 });
    }

    const providerUser = await get${name}User(code);

    // Check if OAuth account already linked
    let oauthAccount = await this.db.findOne(OAuthAccount, {
      provider: "${provider}",
      provider_user_id: providerUser.id,
    });

    let userId: number;

    if (oauthAccount) {
      userId = oauthAccount.user_id as number;
    } else {
      // Check if user exists with same email
      let user = await this.db.findOne(User, { email: providerUser.email });

      if (!user) {
        user = await this.db.create(User, {
          email: providerUser.email,
          name: providerUser.name,
          created_at: new Date().toISOString(),
        });
      }

      userId = user.id as number;

      await this.db.create(OAuthAccount, {
        user_id: userId,
        provider: "${provider}",
        provider_user_id: providerUser.id,
        email: providerUser.email,
      });
    }

    const accessToken = await signAccessToken(String(userId));
    const refreshToken = await signRefreshToken(String(userId));

    await this.db.create(RefreshToken, {
      user_id: userId,
      token: refreshToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    return Res.json({ accessToken, refreshToken });
  }
}
`;
}

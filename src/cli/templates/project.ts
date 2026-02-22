import { randomBytes } from "node:crypto";

export interface AuthConfig {
  enabled: boolean;
  google?: boolean;
  facebook?: boolean;
  github?: boolean;
}

export function appTemplate(dialect?: string, auth?: AuthConfig): string {
  if (dialect && dialect !== "none") {
    const urlMap: Record<string, string> = {
      sqlite: "./data.db",
      postgres: "postgres://localhost:5432/myapp",
      mysql: "mysql://localhost:3306/myapp",
      mongodb: "mongodb://localhost:27017/myapp",
    };
    const url = urlMap[dialect] ?? "./data.db";

    if (auth?.enabled) {
      const providers = (["google", "facebook", "github"] as const).filter(
        (p) => auth[p],
      );

      const imports = [
        `import { App, Config, Database, v } from "jsxserve";`,
        `import { serve } from "jsxserve";`,
        `import { Home } from "@/controllers/home.js";`,
        `import { Register } from "@/controllers/auth/register.js";`,
        `import { Login } from "@/controllers/auth/login.js";`,
        `import { Refresh } from "@/controllers/auth/refresh.js";`,
        `import { Logout } from "@/controllers/auth/logout.js";`,
      ];

      const controllers = [
        `        <Home path="/" />`,
        `        <Register path="/auth/register" />`,
        `        <Login path="/auth/login" />`,
        `        <Refresh path="/auth/refresh" />`,
        `        <Logout path="/auth/logout" />`,
      ];

      for (const p of providers) {
        const name = p.charAt(0).toUpperCase() + p.slice(1);
        imports.push(
          `import { ${name}Auth } from "@/controllers/auth/${p}.js";`,
        );
        imports.push(
          `import { ${name}Callback } from "@/controllers/auth/${p}-callback.js";`,
        );
        controllers.push(`        <${name}Auth path="/auth/${p}" />`);
        controllers.push(
          `        <${name}Callback path="/auth/${p}/callback" />`,
        );
      }

      const schemaEntries = ["PORT: v.number()", "JWT_SECRET: v.string()"];
      for (const p of providers) {
        const prefix = p.toUpperCase();
        schemaEntries.push(`${prefix}_CLIENT_ID: v.string()`);
        schemaEntries.push(`${prefix}_CLIENT_SECRET: v.string()`);
        schemaEntries.push(`${prefix}_REDIRECT_URI: v.string()`);
      }

      return `${imports.join("\n")}

const app = (
  <App port={3000}>
    <Config
      schema={{ ${schemaEntries.join(", ")} }}
      env=".env"
    >
      <Database dialect="${dialect}" url="${url}">
${controllers.join("\n")}
      </Database>
    </Config>
  </App>
);

serve(app);
`;
    }

    return `import { App, Config, Database, v } from "jsxserve";
import { serve } from "jsxserve";
import { Home } from "@/controllers/home.js";

const app = (
  <App port={3000}>
    <Config
      schema={{ PORT: v.number() }}
      env=".env"
    >
      <Database dialect="${dialect}" url="${url}">
        <Home path="/" />
      </Database>
    </Config>
  </App>
);

serve(app);
`;
  }

  return `import { App, Config, v } from "jsxserve";
import { serve } from "jsxserve";
import { Home } from "@/controllers/home.js";

const app = (
  <App port={3000}>
    <Config
      schema={{ PORT: v.number() }}
      env=".env"
    >
      <Home path="/" />
    </Config>
  </App>
);

serve(app);
`;
}

export function homeControllerTemplate(): string {
  return `import { Controller, type JsxpressRequest } from "jsxserve";
import { Res } from "jsxserve";

export class Home extends Controller {
  name = "home";

  get(req: JsxpressRequest) {
    return Res.json({ message: "Welcome to jsxpress!" });
  }
}
`;
}

export function tsconfigTemplate(): string {
  return `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["node"],
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "jsxImportSource": "jsxserve",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
`;
}

export function packageJsonTemplate(
  name: string,
  dialect?: string,
  auth?: boolean,
): string {
  const deps: Record<string, string> = {
    jsxserve: "latest",
  };

  const devDeps: Record<string, string> = {
    "@types/node": "^22.0.0",
    "tsc-alias": "^1.8.0",
    typescript: "^5.7.0",
  };

  if (dialect && dialect !== "none") {
    const dbDeps: Record<string, string> = {
      sqlite: "better-sqlite3",
      postgres: "pg",
      mysql: "mysql2",
      mongodb: "mongodb",
    };
    const dep = dbDeps[dialect];
    if (dep) deps[dep] = "latest";
  }

  if (auth) {
    deps["jose"] = "latest";
  }

  const pkg = {
    name,
    version: "0.1.0",
    type: "module",
    scripts: {
      dev: "npx jsxserve dev",
      build: "npx jsxserve build",
    },
    dependencies: deps,
    devDependencies: devDeps,
  };

  return JSON.stringify(pkg, null, 2) + "\n";
}

export function envTemplate(dialect?: string, auth?: AuthConfig): string {
  let result = "PORT=3000\n";

  if (dialect && dialect !== "none") {
    const urlMap: Record<string, string> = {
      sqlite: "./data.db",
      postgres: "postgres://localhost:5432/myapp",
      mysql: "mysql://localhost:3306/myapp",
      mongodb: "mongodb://localhost:27017/myapp",
    };
    const url = urlMap[dialect] ?? "./data.db";
    result += `\n# Database connection URL — update this for your environment\nDATABASE_URL=${url}\n`;
  }

  if (auth?.enabled) {
    const secret = randomBytes(32).toString("hex");
    result += `\n# Authentication\nJWT_SECRET=${secret}\nJWT_ACCESS_EXPIRY=15m\nJWT_REFRESH_EXPIRY=7d\n`;

    const providerConfigs: Record<string, { name: string; callbackPath: string }> = {
      google: { name: "Google", callbackPath: "/auth/google/callback" },
      facebook: { name: "Facebook", callbackPath: "/auth/facebook/callback" },
      github: { name: "GitHub", callbackPath: "/auth/github/callback" },
    };

    for (const [key, config] of Object.entries(providerConfigs)) {
      if (auth[key as keyof AuthConfig]) {
        const prefix = key.toUpperCase();
        result += `\n# ${config.name} OAuth\n`;
        result += `${prefix}_CLIENT_ID=your-${key}-client-id\n`;
        result += `${prefix}_CLIENT_SECRET=your-${key}-client-secret\n`;
        result += `${prefix}_REDIRECT_URI=http://localhost:3000${config.callbackPath}\n`;
      }
    }
  }

  return result;
}

export function gitignoreTemplate(): string {
  return `node_modules
dist
*.db
.env
`;
}

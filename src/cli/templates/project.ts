import { randomBytes } from "node:crypto";

export interface AuthConfig {
  enabled: boolean;
  google?: boolean;
  facebook?: boolean;
  github?: boolean;
}

const STORAGE_CONFIGS: Record<string, {
  schemaEntries: string[];
  envBlock: string;
  sdkDeps: Record<string, string>;
}> = {
  s3: {
    schemaEntries: [
      "S3_BUCKET: v.string()",
      "S3_REGION: v.string()",
      "S3_ENDPOINT: v.string()",
      "AWS_ACCESS_KEY_ID: v.string()",
      "AWS_SECRET_ACCESS_KEY: v.string()",
    ],
    envBlock: "\n# S3 Storage\nS3_BUCKET=my-bucket\nS3_REGION=us-east-1\nS3_ENDPOINT=\nAWS_ACCESS_KEY_ID=your-access-key-id\nAWS_SECRET_ACCESS_KEY=your-secret-access-key\n",
    sdkDeps: {
      "@aws-sdk/client-s3": "latest",
      "@aws-sdk/s3-request-presigner": "latest",
    },
  },
  gcs: {
    schemaEntries: [
      "GCS_BUCKET: v.string()",
      "GCS_PROJECT_ID: v.string()",
      "GOOGLE_APPLICATION_CREDENTIALS: v.string()",
    ],
    envBlock: "\n# Google Cloud Storage\nGCS_BUCKET=my-bucket\nGCS_PROJECT_ID=my-project\nGOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json\n",
    sdkDeps: {
      "@google-cloud/storage": "latest",
    },
  },
  azure: {
    schemaEntries: [
      "AZURE_STORAGE_CONTAINER: v.string()",
      "AZURE_STORAGE_CONNECTION_STRING: v.string()",
    ],
    envBlock: "\n# Azure Blob Storage\nAZURE_STORAGE_CONTAINER=my-container\nAZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net\n",
    sdkDeps: {
      "@azure/storage-blob": "latest",
    },
  },
};

const CACHE_CONFIGS: Record<string, {
  schemaEntries: string[];
  envBlock: string;
  sdkDeps: Record<string, string>;
}> = {
  memory: {
    schemaEntries: [],
    envBlock: "",
    sdkDeps: {},
  },
  redis: {
    schemaEntries: ["REDIS_URL: v.string()"],
    envBlock: "\n# Redis Cache\nREDIS_URL=redis://localhost:6379\n",
    sdkDeps: { ioredis: "latest" },
  },
};

export function appTemplate(dialect?: string, auth?: AuthConfig, storage?: string, cache?: string): string {
  const useStorage = storage != null && storage !== "none";
  const storageConfig = useStorage ? STORAGE_CONFIGS[storage] : null;
  const useCache = cache != null && cache !== "none";
  const cacheConfig = useCache ? CACHE_CONFIGS[cache] : null;

  // Helper to wrap content in Cache if enabled, given a base indent level
  function wrapWithCache(content: string, baseIndent: string): string {
    if (!useCache) return content;
    return `${baseIndent}<Cache driver="${cache}"${cache === "redis" ? " redisUrl={config.REDIS_URL}" : ""}>\n${content}\n${baseIndent}</Cache>`;
  }

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

      const jsxserveImports = ["App", "Config", "Database"];
      if (useStorage) jsxserveImports.push("Storage");
      if (useCache) jsxserveImports.push("Cache");
      jsxserveImports.push("v");

      const imports = [
        `import { ${jsxserveImports.join(", ")} } from "jsxserve";`,
        `import { serve } from "jsxserve";`,
        `import { Home } from "@/controllers/home.js";`,
        `import { Register } from "@/controllers/auth/register.js";`,
        `import { Login } from "@/controllers/auth/login.js";`,
        `import { Refresh } from "@/controllers/auth/refresh.js";`,
        `import { Logout } from "@/controllers/auth/logout.js";`,
      ];

      // Calculate controller indent based on nesting depth
      let depth = 4; // base: App > Config > Database
      if (useStorage) depth++;
      if (useCache) depth++;
      const indent = "  ".repeat(depth);
      const controllers = [
        `${indent}<Home path="/" />`,
        `${indent}<Register path="/auth/register" />`,
        `${indent}<Login path="/auth/login" />`,
        `${indent}<Refresh path="/auth/refresh" />`,
        `${indent}<Logout path="/auth/logout" />`,
      ];

      for (const p of providers) {
        const name = p.charAt(0).toUpperCase() + p.slice(1);
        imports.push(
          `import { ${name}Auth } from "@/controllers/auth/${p}.js";`,
        );
        imports.push(
          `import { ${name}Callback } from "@/controllers/auth/${p}-callback.js";`,
        );
        controllers.push(`${indent}<${name}Auth path="/auth/${p}" />`);
        controllers.push(
          `${indent}<${name}Callback path="/auth/${p}/callback" />`,
        );
      }

      const schemaEntries = ["PORT: v.number()", "JWT_SECRET: v.string()"];
      if (storageConfig) {
        schemaEntries.push(...storageConfig.schemaEntries);
      }
      if (cacheConfig) {
        schemaEntries.push(...cacheConfig.schemaEntries);
      }
      for (const p of providers) {
        const prefix = p.toUpperCase();
        schemaEntries.push(`${prefix}_CLIENT_ID: v.string()`);
        schemaEntries.push(`${prefix}_CLIENT_SECRET: v.string()`);
        schemaEntries.push(`${prefix}_REDIRECT_URI: v.string()`);
      }

      let innerContent = controllers.join("\n");
      // Wrap order (innermost first): Cache, then Storage
      if (useCache) {
        const cacheIndent = useStorage ? "          " : "        ";
        innerContent = wrapWithCache(innerContent, cacheIndent);
      }
      if (useStorage) {
        innerContent = `        <Storage>\n${innerContent}\n        </Storage>`;
      }

      return `${imports.join("\n")}

const app = (
  <App port={3000}>
    <Config
      schema={{ ${schemaEntries.join(", ")} }}
      env=".env"
    >
      <Database dialect="${dialect}" url="${url}">
${innerContent}
      </Database>
    </Config>
  </App>
);

serve(app);
`;
    }

    // No auth, with database
    const importParts = ["App", "Config", "Database"];
    if (useStorage) importParts.push("Storage");
    if (useCache) importParts.push("Cache");
    importParts.push("v");
    const dbImports = `import { ${importParts.join(", ")} } from "jsxserve";`;

    const schemaEntries = ["PORT: v.number()"];
    if (storageConfig) {
      schemaEntries.push(...storageConfig.schemaEntries);
    }
    if (cacheConfig) {
      schemaEntries.push(...cacheConfig.schemaEntries);
    }

    let dbChildren: string;
    // Build from innermost out: controller -> Cache -> Storage
    let depth = 4; // App > Config > Database
    if (useStorage) depth++;
    if (useCache) depth++;
    const controllerIndent = "  ".repeat(depth);
    let inner = `${controllerIndent}<Home path="/" />`;

    if (useCache) {
      const cacheIndent = useStorage ? "          " : "        ";
      inner = wrapWithCache(inner, cacheIndent);
    }
    if (useStorage) {
      dbChildren = `        <Storage>\n${inner}\n        </Storage>`;
    } else {
      dbChildren = inner;
    }

    return `${dbImports}
import { serve } from "jsxserve";
import { Home } from "@/controllers/home.js";

const app = (
  <App port={3000}>
    <Config
      schema={{ ${schemaEntries.join(", ")} }}
      env=".env"
    >
      <Database dialect="${dialect}" url="${url}">
${dbChildren}
      </Database>
    </Config>
  </App>
);

serve(app);
`;
  }

  // No database
  const noDbImportParts = ["App", "Config"];
  if (useStorage) noDbImportParts.push("Storage");
  if (useCache) noDbImportParts.push("Cache");
  noDbImportParts.push("v");
  const noDbImports = `import { ${noDbImportParts.join(", ")} } from "jsxserve";`;

  const schemaEntries = ["PORT: v.number()"];
  if (storageConfig) {
    schemaEntries.push(...storageConfig.schemaEntries);
  }
  if (cacheConfig) {
    schemaEntries.push(...cacheConfig.schemaEntries);
  }

  // Build from innermost out: controller -> Cache -> Storage
  let depth = 3; // App > Config
  if (useStorage) depth++;
  if (useCache) depth++;
  const controllerIndent = "  ".repeat(depth);
  let configInner = `${controllerIndent}<Home path="/" />`;

  if (useCache) {
    const cacheIndent = useStorage ? "        " : "      ";
    configInner = wrapWithCache(configInner, cacheIndent);
  }

  let configChildren: string;
  if (useStorage) {
    configChildren = `      <Storage>\n${configInner}\n      </Storage>`;
  } else {
    configChildren = configInner;
  }

  return `${noDbImports}
import { serve } from "jsxserve";
import { Home } from "@/controllers/home.js";

const app = (
  <App port={3000}>
    <Config
      schema={{ ${schemaEntries.join(", ")} }}
      env=".env"
    >
${configChildren}
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
  storage?: string,
  cache?: string,
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

  const storageConfig = storage && storage !== "none" ? STORAGE_CONFIGS[storage] : null;
  if (storageConfig) {
    Object.assign(deps, storageConfig.sdkDeps);
  }

  const cacheConfig = cache && cache !== "none" ? CACHE_CONFIGS[cache] : null;
  if (cacheConfig) {
    Object.assign(deps, cacheConfig.sdkDeps);
  }

  const scripts: Record<string, string> = {
    dev: "npx jsxserve dev",
    build: "npx jsxserve build",
  };

  if (dialect && dialect !== "none" && dialect !== "mongodb") {
    scripts["migrate"] = "npx jsxserve migrate up";
    scripts["migrate:down"] = "npx jsxserve migrate down";
    scripts["migrate:status"] = "npx jsxserve migrate status";
    scripts["migrate:generate"] = "npx jsxserve migrate generate";
    scripts["migrate:diff"] = "npx jsxserve migrate diff";
  }

  const pkg = {
    name,
    version: "0.1.0",
    type: "module",
    scripts,
    dependencies: deps,
    devDependencies: devDeps,
  };

  return JSON.stringify(pkg, null, 2) + "\n";
}

export function envTemplate(dialect?: string, auth?: AuthConfig, storage?: string, cache?: string): string {
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

  const storageConfig = storage && storage !== "none" ? STORAGE_CONFIGS[storage] : null;
  if (storageConfig) {
    result += storageConfig.envBlock;
  }

  const cacheConfig = cache && cache !== "none" ? CACHE_CONFIGS[cache] : null;
  if (cacheConfig) {
    result += cacheConfig.envBlock;
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

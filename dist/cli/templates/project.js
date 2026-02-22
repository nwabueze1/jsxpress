export function appTemplate(dialect) {
    if (dialect && dialect !== "none") {
        const urlMap = {
            sqlite: "./data.db",
            postgres: "postgres://localhost:5432/myapp",
            mysql: "mysql://localhost:3306/myapp",
            mongodb: "mongodb://localhost:27017/myapp",
        };
        const url = urlMap[dialect] ?? "./data.db";
        return `import { App, Config, Database, v } from "jsxserve";
import { serve } from "jsxserve";
import { Home } from "./controllers/home.js";

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
import { Home } from "./controllers/home.js";

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
export function homeControllerTemplate() {
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
export function tsconfigTemplate() {
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
    "jsxImportSource": "jsxserve"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
`;
}
export function packageJsonTemplate(name, dialect) {
    const deps = {
        jsxserve: "latest",
    };
    const devDeps = {
        "@types/node": "^22.0.0",
        typescript: "^5.7.0",
    };
    if (dialect && dialect !== "none") {
        const dbDeps = {
            sqlite: "better-sqlite3",
            postgres: "pg",
            mysql: "mysql2",
            mongodb: "mongodb",
        };
        const dep = dbDeps[dialect];
        if (dep)
            deps[dep] = "latest";
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
export function envTemplate(dialect) {
    if (dialect && dialect !== "none") {
        const urlMap = {
            sqlite: "./data.db",
            postgres: "postgres://localhost:5432/myapp",
            mysql: "mysql://localhost:3306/myapp",
            mongodb: "mongodb://localhost:27017/myapp",
        };
        const url = urlMap[dialect] ?? "./data.db";
        return `PORT=3000

# Database connection URL — update this for your environment
DATABASE_URL=${url}
`;
    }
    return `PORT=3000\n`;
}
export function gitignoreTemplate() {
    return `node_modules
dist
*.db
.env
`;
}
//# sourceMappingURL=project.js.map
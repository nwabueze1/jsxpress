export function appTemplate(dialect?: string): string {
  if (dialect && dialect !== "none") {
    const urlMap: Record<string, string> = {
      sqlite: "./data.db",
      postgres: "postgres://localhost:5432/myapp",
      mysql: "mysql://localhost:3306/myapp",
      mongodb: "mongodb://localhost:27017/myapp",
    };
    const url = urlMap[dialect] ?? "./data.db";

    return `import { App, Database } from "jsxpress";
import { serve } from "jsxpress";
import { Home } from "./controllers/home.js";

const app = (
  <App port={3000}>
    <Database dialect="${dialect}" url="${url}">
      <Home path="/" />
    </Database>
  </App>
);

serve(app);
`;
  }

  return `import { App } from "jsxpress";
import { serve } from "jsxpress";
import { Home } from "./controllers/home.js";

const app = (
  <App port={3000}>
    <Home path="/" />
  </App>
);

serve(app);
`;
}

export function homeControllerTemplate(): string {
  return `import { Controller, type JsxpressRequest } from "jsxpress";
import { Res } from "jsxpress";

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
    "jsxImportSource": "jsxpress"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
`;
}

export function packageJsonTemplate(name: string, dialect?: string): string {
  const deps: Record<string, string> = {
    jsxpress: "latest",
  };

  const devDeps: Record<string, string> = {
    "@types/node": "^22.0.0",
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

  const pkg = {
    name,
    version: "0.1.0",
    type: "module",
    scripts: {
      dev: "npx jsxpress dev",
      build: "npx jsxpress build",
    },
    dependencies: deps,
    devDependencies: devDeps,
  };

  return JSON.stringify(pkg, null, 2) + "\n";
}

export function gitignoreTemplate(): string {
  return `node_modules
dist
*.db
.env
`;
}

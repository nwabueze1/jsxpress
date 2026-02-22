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
});

describe("gitignoreTemplate", () => {
  it("includes common entries", () => {
    const result = gitignoreTemplate();
    expect(result).toContain("node_modules");
    expect(result).toContain("dist");
  });
});

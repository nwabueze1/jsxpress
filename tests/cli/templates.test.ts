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
  gitignoreTemplate,
} from "../../src/cli/templates/project.js";

describe("controllerTemplate", () => {
  it("generates correct class and name", () => {
    const result = controllerTemplate("users");
    expect(result).toContain("class Users extends Controller");
    expect(result).toContain('name = "users"');
    expect(result).toContain('from "jsxpress"');
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
    expect(result).toContain('from "jsxpress"');
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
    expect(result).toContain("import { App, Database }");
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
    expect(result).toContain('"jsxpress"');
  });
});

describe("gitignoreTemplate", () => {
  it("includes common entries", () => {
    const result = gitignoreTemplate();
    expect(result).toContain("node_modules");
    expect(result).toContain("dist");
  });
});

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "./src",
  },
});

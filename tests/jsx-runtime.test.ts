import { describe, it, expect } from "vitest";
import { jsx, jsxs, Fragment } from "../src/jsx-runtime.js";
import { FragmentSymbol } from "../src/types.js";

describe("jsx-runtime", () => {
  it("jsx() creates a JsxElement descriptor", () => {
    const el = jsx("div", { id: "test" });
    expect(el).toEqual({ type: "div", props: { id: "test" }, key: null });
  });

  it("jsx() passes key through", () => {
    const el = jsx("div", {}, "my-key");
    expect(el.key).toBe("my-key");
  });

  it("jsxs is the same function as jsx", () => {
    expect(jsxs).toBe(jsx);
  });

  it("Fragment is the FragmentSymbol", () => {
    expect(Fragment).toBe(FragmentSymbol);
  });

  it("jsx() works with class types", () => {
    class MyComponent {}
    const el = jsx(MyComponent, { children: [] });
    expect(el.type).toBe(MyComponent);
    expect(el.props).toEqual({ children: [] });
  });
});

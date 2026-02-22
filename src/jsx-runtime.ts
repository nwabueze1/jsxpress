import { FragmentSymbol } from "./types.js";
import type { JsxElement, JsxChild } from "./types.js";

export const Fragment = FragmentSymbol;

export function jsx(
  type: JsxElement["type"],
  props: Record<string, unknown>,
  key?: string
): JsxElement {
  return { type, props, key: key ?? null };
}

export const jsxs = jsx;

export declare namespace JSX {
  type Element = JsxElement;
  interface ElementChildrenAttribute {
    children: {};
  }
  interface IntrinsicElements {}
}

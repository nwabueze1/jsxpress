import { Fragment, jsx } from "./jsx-runtime.js";
import type { JsxElement } from "./types.js";

export { Fragment };

export function jsxDEV(
  type: JsxElement["type"],
  props: Record<string, unknown>,
  key?: string
): JsxElement {
  return jsx(type, props, key);
}

import type { JsxElement } from "./types.js";
export declare const Fragment: symbol;
export declare function jsx(type: JsxElement["type"], props: Record<string, unknown>, key?: string): JsxElement;
export declare const jsxs: typeof jsx;
export declare namespace JSX {
    type Element = JsxElement;
    interface ElementChildrenAttribute {
        children: {};
    }
    interface IntrinsicElements {
    }
}
//# sourceMappingURL=jsx-runtime.d.ts.map
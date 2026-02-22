import { FragmentSymbol } from "./types.js";
export const Fragment = FragmentSymbol;
export function jsx(type, props, key) {
    return { type, props, key: key ?? null };
}
export const jsxs = jsx;
//# sourceMappingURL=jsx-runtime.js.map
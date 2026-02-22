export function isBun(): boolean {
  return typeof (globalThis as any).Bun !== "undefined";
}

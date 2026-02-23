import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MemoryAdapter } from "../src/cache/adapters/memory.js";

describe("MemoryAdapter", () => {
  let adapter: MemoryAdapter;

  beforeEach(() => {
    vi.useFakeTimers();
    adapter = new MemoryAdapter();
  });

  afterEach(async () => {
    await adapter.close();
    vi.useRealTimers();
  });

  it("set/get round-trip", async () => {
    await adapter.set("key", { hello: "world" });
    const result = await adapter.get("key");
    expect(result).toEqual({ hello: "world" });
  });

  it("get returns null for missing key", async () => {
    const result = await adapter.get("nonexistent");
    expect(result).toBeNull();
  });

  it("has returns true for existing key", async () => {
    await adapter.set("key", "value");
    expect(await adapter.has("key")).toBe(true);
  });

  it("has returns false for missing key", async () => {
    expect(await adapter.has("nonexistent")).toBe(false);
  });

  it("del removes an entry", async () => {
    await adapter.set("key", "value");
    await adapter.del("key");
    expect(await adapter.get("key")).toBeNull();
    expect(await adapter.has("key")).toBe(false);
  });

  it("returns null after TTL expires", async () => {
    await adapter.set("key", "value", 1000);
    vi.advanceTimersByTime(1001);
    expect(await adapter.get("key")).toBeNull();
    expect(await adapter.has("key")).toBe(false);
  });

  it("returns value before TTL expires", async () => {
    await adapter.set("key", "value", 1000);
    vi.advanceTimersByTime(500);
    expect(await adapter.get("key")).toBe("value");
    expect(await adapter.has("key")).toBe(true);
  });

  it("set overwrites existing value and resets TTL", async () => {
    await adapter.set("key", "first", 1000);
    vi.advanceTimersByTime(500);
    await adapter.set("key", "second", 2000);
    vi.advanceTimersByTime(1500);
    expect(await adapter.get("key")).toBe("second");
  });

  it("no TTL persists indefinitely", async () => {
    await adapter.set("key", "forever");
    vi.advanceTimersByTime(999999);
    expect(await adapter.get("key")).toBe("forever");
  });
});

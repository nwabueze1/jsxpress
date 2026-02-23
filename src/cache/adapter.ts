export type CacheDriver = "memory" | "redis";

export interface CacheAdapter {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlMs?: number): Promise<void>;
  del(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
  initialize?(): Promise<void>;
  close?(): Promise<void>;
}

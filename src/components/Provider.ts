export abstract class Provider {
  abstract contextKey: symbol;

  abstract getContextValue(): unknown;

  startup?(): Promise<void>;
  shutdown?(): Promise<void>;
}

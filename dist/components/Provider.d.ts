export declare abstract class Provider {
    abstract contextKey: symbol;
    abstract getContextValue(): unknown;
    startup?(): Promise<void>;
    shutdown?(): Promise<void>;
}
//# sourceMappingURL=Provider.d.ts.map
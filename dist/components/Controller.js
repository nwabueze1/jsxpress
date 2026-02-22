const CONFIG_KEY = Symbol.for("jsxpress.config");
export class Controller {
    schema;
    /** @internal — populated by tree compiler from Provider context */
    __context = new Map();
    context(key) {
        if (!this.__context.has(key)) {
            throw new Error(`Context not found for key: ${key.toString()}`);
        }
        return this.__context.get(key);
    }
    config() {
        return this.context(CONFIG_KEY);
    }
}
//# sourceMappingURL=Controller.js.map
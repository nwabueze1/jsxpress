export class MemoryAdapter {
    store = new Map();
    timers = new Map();
    async get(key) {
        const entry = this.store.get(key);
        if (!entry)
            return null;
        if (entry.expiresAt !== null && Date.now() >= entry.expiresAt) {
            this.store.delete(key);
            return null;
        }
        return entry.value;
    }
    async set(key, value, ttlMs) {
        const oldTimer = this.timers.get(key);
        if (oldTimer !== undefined) {
            clearTimeout(oldTimer);
            this.timers.delete(key);
        }
        const expiresAt = ttlMs != null ? Date.now() + ttlMs : null;
        this.store.set(key, { value, expiresAt });
        if (ttlMs != null) {
            const timer = setTimeout(() => {
                this.store.delete(key);
                this.timers.delete(key);
            }, ttlMs);
            this.timers.set(key, timer);
        }
    }
    async del(key) {
        this.store.delete(key);
        const timer = this.timers.get(key);
        if (timer !== undefined) {
            clearTimeout(timer);
            this.timers.delete(key);
        }
    }
    async has(key) {
        const entry = this.store.get(key);
        if (!entry)
            return false;
        if (entry.expiresAt !== null && Date.now() >= entry.expiresAt) {
            this.store.delete(key);
            return false;
        }
        return true;
    }
    async close() {
        for (const timer of this.timers.values()) {
            clearTimeout(timer);
        }
        this.timers.clear();
        this.store.clear();
    }
}
//# sourceMappingURL=memory.js.map
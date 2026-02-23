import { readdir } from "node:fs/promises";
export async function nextMigrationNumber(migrationsDir) {
    try {
        const entries = await readdir(migrationsDir);
        let max = 0;
        for (const entry of entries) {
            const match = entry.match(/^(\d+)/);
            if (match) {
                const n = parseInt(match[1], 10);
                if (n > max)
                    max = n;
            }
        }
        return max + 1;
    }
    catch {
        return 1;
    }
}
export function pad(n, width) {
    return String(n).padStart(width, "0");
}
//# sourceMappingURL=migration.js.map
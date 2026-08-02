import { expect, test } from "bun:test";

process.env.DATABASE_URL = "postgresql://stock:stock@localhost:5432/stock_lan";
process.env.REDIS_URL = "redis://localhost:6379";
process.env.JWT_SECRET = "test-jwt-secret-with-at-least-32-characters";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-with-at-least-32-chars";

const { getOrSetLocal, invalidatePrefix, localCache } = await import("../../src/lib/cache.js");

test("returns NodeCache L1 entries before executing the factory", async () => {
    localCache.flushAll();
    let calls = 0;
    const factory = async () => ({ value: ++calls });
    expect(await getOrSetLocal("cache:test", 60, factory)).toEqual({ value: 1 });
    expect(await getOrSetLocal("cache:test", 60, factory)).toEqual({ value: 1 });
    expect(calls).toBe(1);
});

test("invalidates all local entries by prefix", async () => {
    localCache.flushAll();
    localCache.set("sales:list:1", true);
    localCache.set("sales:id:1", true);
    localCache.set("stock:product:1", true);
    await invalidatePrefix("sales:");
    expect(localCache.has("sales:list:1")).toBeFalse();
    expect(localCache.has("sales:id:1")).toBeFalse();
    expect(localCache.has("stock:product:1")).toBeTrue();
});

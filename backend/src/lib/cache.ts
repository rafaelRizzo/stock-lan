import NodeCache from "node-cache";
import { createClient } from "redis";
import { env } from "../config/env.js";

export const localCache = new NodeCache({ stdTTL: 60, useClones: false });
export const redis = createClient({ url: env.REDIS_URL });

redis.on("error", (error) => {
    if (env.NODE_ENV !== "test") console.error("Redis error", error);
});

export async function connectRedis() {
    if (!redis.isOpen) await redis.connect();
}

export async function closeRedis() {
    if (redis.isOpen) await redis.quit();
}

export async function invalidate(...keys: string[]) {
    localCache.del(keys);
    if (redis.isOpen && keys.length) await redis.del(keys);
}

export async function invalidatePrefix(prefix: string) {
    const keys = localCache.keys().filter((key) => key.startsWith(prefix));
    if (keys.length) localCache.del(keys);
}

export async function getOrSetLocal<T>(key: string, ttlSeconds: number, factory: () => Promise<T>) {
    const cached = localCache.get<T>(key);
    if (cached !== undefined) return cached;
    const value = await factory();
    localCache.set(key, value, ttlSeconds);
    return value;
}

import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

let isConnected = false;

const client = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      // Limit reconnection retries to avoid flooding logs when Redis is down
      if (retries > 5) {
        return new Error("Max reconnect retries reached");
      }
      return Math.min(retries * 500, 2000);
    }
  }
});

client.on("connect", () => {
  isConnected = true;
  console.log("🔌 Redis: Connected to server");
});

client.on("ready", () => {
  isConnected = true;
  console.log("🔌 Redis: Client ready");
});

client.on("error", (err) => {
  isConnected = false;
  console.warn("⚠️ Redis client warning/error:", err.message || err);
});

client.on("end", () => {
  isConnected = false;
  console.log("🔌 Redis: Connection closed");
});

// Immediately connect to Redis in a non-blocking way
const shouldDisableRedis = process.env.DISABLE_REDIS === "true" || !process.env.REDIS_URL;

if (process.env.NODE_ENV !== "test" && !shouldDisableRedis) {
  client.connect().catch((err) => {
    console.warn("⚠️ Redis: Initial connection failed, running in fallback mode.", err.message || err);
    isConnected = false;
  });
} else if (shouldDisableRedis) {
  isConnected = false;
}

export const redisClient = client;

/**
 * Get a parsed object from cache
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!isConnected) return null;
  try {
    const raw = await client.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Error reading cache key "${key}":`, err);
    return null;
  }
}

/**
 * Save an object to cache with an optional TTL
 */
export async function cacheSet(key: string, value: any, ttlSeconds = 3600): Promise<void> {
  if (!isConnected) return;
  try {
    const serialized = JSON.stringify(value);
    if (ttlSeconds > 0) {
      await client.set(key, serialized, { EX: ttlSeconds });
    } else {
      await client.set(key, serialized);
    }
  } catch (err) {
    console.error(`Error writing cache key "${key}":`, err);
  }
}

/**
 * Delete a cache key
 */
export async function cacheDel(key: string): Promise<void> {
  if (!isConnected) return;
  try {
    await client.del(key);
  } catch (err) {
    console.error(`Error deleting cache key "${key}":`, err);
  }
}

/**
 * Check if the Redis cache is alive
 */
export function isCacheAlive(): boolean {
  return isConnected;
}

/**
 * Invalidation helpers
 */
export async function cacheInvalidateUser(userId: string): Promise<void> {
  await cacheDel(`user:profile:${userId}`);
}

export async function cacheInvalidateLesson(lessonId: string): Promise<void> {
  await cacheDel(`lesson:detail:${lessonId}`);
}

export async function cacheInvalidateQuestion(templateId: string): Promise<void> {
  await cacheDel(`question:template:${templateId}`);
}


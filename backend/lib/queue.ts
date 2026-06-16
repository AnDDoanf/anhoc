import { Queue } from "bullmq";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

// Parse connection options from Redis URL for BullMQ (which uses ioredis internally)
const getRedisConnectionOptions = () => {
  try {
    const parsed = new URL(redisUrl);
    return {
      host: parsed.hostname || "127.0.0.1",
      port: parsed.port ? Number(parsed.port) : 6379,
      username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      tls: parsed.protocol === "rediss:" ? {} : undefined,
      maxRetriesPerRequest: null, // Critical setting required by BullMQ
    };
  } catch {
    return {
      host: "127.0.0.1",
      port: 6379,
      maxRetriesPerRequest: null,
    };
  }
};

export const connection = getRedisConnectionOptions();

// Export the Queues
export const emailQueue = new Queue("email", { connection });
export const notificationQueue = new Queue("notification", { connection });
export const achievementQueue = new Queue("achievement", { connection });
export const analyticsQueue = new Queue("analytics", { connection });

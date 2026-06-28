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
class MockQueue {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
  async add(name: string, data: any) {
    return { id: "mock-job-id", name, data };
  }
  async close() {
    return;
  }
}

export const emailQueue =
  process.env.NODE_ENV === "test"
    ? (new MockQueue("email") as any)
    : new Queue("email", { connection });

export const notificationQueue =
  process.env.NODE_ENV === "test"
    ? (new MockQueue("notification") as any)
    : new Queue("notification", { connection });

export const achievementQueue =
  process.env.NODE_ENV === "test"
    ? (new MockQueue("achievement") as any)
    : new Queue("achievement", { connection });

export const analyticsQueue =
  process.env.NODE_ENV === "test"
    ? (new MockQueue("analytics") as any)
    : new Queue("analytics", { connection });

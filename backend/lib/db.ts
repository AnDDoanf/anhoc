import { PrismaClient } from "../prisma/client/index.js";
import pg from "pg";
import { logger } from "./logger.ts";

// ── Pool Configuration (tunable via environment variables) ──────────
const connectionString = process.env.DATABASE_URL!;

const pool = new pg.Pool({
  connectionString,
  max: parseInt(process.env.DB_POOL_MAX || "10", 10),
  idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || "30000", 10),
  connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || "5000", 10),
});

// ── Pool Observability ──────────────────────────────────────────────
pool.on("connect", () => {
  logger.debug("pg pool: new client connected (total: %d, idle: %d, waiting: %d)",
    pool.totalCount, pool.idleCount, pool.waitingCount);
});

pool.on("remove", () => {
  logger.debug("pg pool: client removed (total: %d, idle: %d, waiting: %d)",
    pool.totalCount, pool.idleCount, pool.waitingCount);
});

pool.on("error", (err) => {
  logger.error({ err }, "pg pool: unexpected error on idle client");
});

// ── Prisma Client ───────────────────────────────────────────────────
const prisma = new PrismaClient({
  log: [
    { emit: "event", level: "query" },
  ],
});

// ── Slow Query Logging ──────────────────────────────────────────────
const SLOW_QUERY_THRESHOLD_MS = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || "200", 10);
const LOG_ALL_QUERIES = (process.env.LOG_ALL_QUERIES || "").toLowerCase() === "true";

prisma.$on("query" as never, (event: any) => {
  const duration = event.duration as number;

  if (LOG_ALL_QUERIES) {
    logger.info({
      prisma_query: true,
      duration_ms: duration,
      query: event.query,
      params: event.params,
    }, `prisma query (${duration}ms)`);
  } else if (duration >= SLOW_QUERY_THRESHOLD_MS) {
    logger.warn({
      prisma_slow_query: true,
      duration_ms: duration,
      query: event.query,
      params: event.params,
    }, `SLOW QUERY detected (${duration}ms >= ${SLOW_QUERY_THRESHOLD_MS}ms threshold)`);
  }
});

// ── Helper: Describe Database Target ────────────────────────────────
export const describeDatabaseTarget = () => {
  try {
    const url = new URL(connectionString);
    const host = url.hostname || "unknown";
    const database = url.pathname.replace(/^\/+/, "") || "unknown";
    const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(host);

    return {
      host,
      database,
      via: isLocalHost ? "local" : "internet",
      maskedUrl: `${url.protocol}//${host}/${database}`,
    };
  } catch {
    return {
      host: "unknown",
      database: "unknown",
      via: "unknown",
      maskedUrl: "invalid DATABASE_URL",
    };
  }
};

// ── Pool Stats (for health checks / diagnostics) ────────────────────
export const getPoolStats = () => ({
  totalCount: pool.totalCount,
  idleCount: pool.idleCount,
  waitingCount: pool.waitingCount,
});

// ── Graceful Shutdown ───────────────────────────────────────────────
export const shutdownPool = async () => {
  logger.info("shutting down pg pool…");
  await prisma.$disconnect();
  await pool.end();
  logger.info("pg pool shut down");
};

export default prisma;

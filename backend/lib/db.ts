import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL!;

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({ adapter });

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

export default prisma;

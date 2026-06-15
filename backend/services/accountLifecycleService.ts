import prisma from "../lib/db.ts";

const NOON_HOUR = 12;
const DAY_MS = 24 * 60 * 60 * 1000;

export const computeInactiveCleanupDeadline = (createdAt: Date) => {
  const deadline = new Date(createdAt);
  deadline.setHours(0, 0, 0, 0);
  deadline.setTime(deadline.getTime() + DAY_MS);

  if (createdAt.getHours() >= NOON_HOUR) {
    deadline.setTime(deadline.getTime() + DAY_MS);
  }

  return deadline;
};

export const purgeExpiredInactiveAccounts = async () => {
  const inactiveUsers = await prisma.user.findMany({
    where: {
      account_status: "inactive",
      security: {
        inactive_cleanup_at: { lte: new Date() },
      },
      audit_logs: { none: {} },
    },
    select: { id: true },
    take: 200,
  });

  if (inactiveUsers.length === 0) {
    return 0;
  }

  const ids = inactiveUsers.map((u) => u.id);
  const result = await prisma.user.deleteMany({
    where: {
      id: { in: ids },
    },
  });

  if (result.count > 0) {
    console.log(`Purged ${result.count} inactive accounts with no activity.`);
  }

  return result.count;
};

const msUntilNextMidnight = () => {
  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 0, 0);
  return nextMidnight.getTime() - now.getTime();
};

export const scheduleInactiveAccountCleanup = () => {
  const run = async () => {
    try {
      await purgeExpiredInactiveAccounts();
    } catch (error) {
      console.error("Inactive account cleanup failed:", error);
    }
  };

  void run();

  const scheduleNext = () => {
    const timeout = msUntilNextMidnight();
    setTimeout(async () => {
      await run();
      scheduleNext();
    }, timeout);
  };

  scheduleNext();
};

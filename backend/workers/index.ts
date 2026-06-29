import { Worker } from "bullmq";
import { connection } from "../lib/queue.ts";
import { sendMailPayload } from "../services/mailerService.ts";
import { createNotificationDirect, notifyAdminsDirect } from "../services/notificationService.ts";
import { checkAndAwardAchievements } from "../services/achievementService.ts";
import prisma from "../lib/db.ts";

let emailWorker: Worker | null = null;
let notificationWorker: Worker | null = null;
let achievementWorker: Worker | null = null;
let analyticsWorker: Worker | null = null;

export function startQueueWorkers() {
  const isRedisDisabled = process.env.DISABLE_REDIS === "true" || !process.env.REDIS_URL;
  if (isRedisDisabled) {
    console.log("⚙️ Redis is disabled or not configured. Background queue workers will not be started.");
    return;
  }

  console.log("⚙️ Starting background queue workers...");

  emailWorker = new Worker(
    "email",
    async (job) => {
      const { to, subject, text, html } = job.data;
      await sendMailPayload({ to, subject, text, html });
    },
    { connection }
  );

  notificationWorker = new Worker(
    "notification",
    async (job) => {
      const { name, data } = job;
      if (name === "create-notification") {
        await createNotificationDirect(data);
      } else if (name === "notify-admins") {
        await notifyAdminsDirect(data);
      }
    },
    { connection }
  );

  achievementWorker = new Worker(
    "achievement",
    async (job) => {
      const { userId } = job.data;
      await checkAndAwardAchievements(userId);
    },
    { connection }
  );

  analyticsWorker = new Worker(
    "analytics",
    async (job) => {
      const { userId, eventType, metadata } = job.data;
      await prisma.auditLog.create({
        data: {
          user_id: userId,
          event_type: eventType,
          metadata: metadata || {},
        },
      });
    },
    { connection }
  );

  // Set up common event listeners for workers
  const workers = [emailWorker, notificationWorker, achievementWorker, analyticsWorker];

  for (const worker of workers) {
    worker.on("completed", (job) => {
      console.log(`✅ Job ${job.id} in queue [${worker.name}] completed`);
    });

    worker.on("failed", (job, err) => {
      console.error(`❌ Job ${job?.id} in queue [${worker.name}] failed:`, err);
    });
  }

  console.log("🚀 Background queue workers initialized");
}

export async function stopQueueWorkers() {
  console.log("⚙️ Stopping background queue workers...");
  if (emailWorker) await emailWorker.close();
  if (notificationWorker) await notificationWorker.close();
  if (achievementWorker) await achievementWorker.close();
  if (analyticsWorker) await analyticsWorker.close();
  console.log("🛑 Background queue workers stopped");
}

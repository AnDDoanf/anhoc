import { Router } from "express";
import prisma from "../lib/db.ts";
import { authenticate } from "../middleware/auth.ts";
import { getNotificationFeed, serializeNotification } from "../services/notificationService.ts";

const router = Router();

const parsePositiveInt = (value: unknown, fallback: number, max = 100) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), max);
};

router.get("/", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id as string;
    const page = parsePositiveInt(req.query.page, 1);
    const pageSize = parsePositiveInt(req.query.pageSize, 10, 50);

    const feed = await getNotificationFeed({ userId, page, pageSize });
    res.json(feed);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch notifications", details: error.message });
  }
});

router.patch("/:id/read", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id as string;
    const id = req.params.id as string;

    const notification = await prisma.notification.updateMany({
      where: {
        id,
        recipient_id: userId,
        read_at: null,
      },
      data: {
        read_at: new Date(),
      },
    });

    if (notification.count === 0) {
      const existing = await prisma.notification.findFirst({
        where: {
          id,
          recipient_id: userId,
        },
        include: {
          actor: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      });

      if (!existing) {
        return res.status(404).json({ error: "Notification not found" });
      }

      return res.json(serializeNotification(existing));
    }

    const updated = await prisma.notification.findUnique({
      where: { id },
      include: {
        actor: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    res.json(updated ? serializeNotification(updated) : null);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to mark notification as read", details: error.message });
  }
});

router.post("/read-all", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id as string;

    const result = await prisma.notification.updateMany({
      where: {
        recipient_id: userId,
        read_at: null,
      },
      data: {
        read_at: new Date(),
      },
    });

    res.json({ updated: result.count });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to mark notifications as read", details: error.message });
  }
});

export default router;

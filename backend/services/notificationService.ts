import prisma from "../lib/db.ts";

type NotificationPayload = Record<string, unknown>;

export const NotificationType = {
  SubjectAccessRequested: "subject_access_requested",
  SubjectAccessApproved: "subject_access_approved",
  SubjectAccessRejected: "subject_access_rejected",
  QuestionReportCreated: "question_report_created",
  QuestionReportUpdated: "question_report_updated",
  NewFollower: "new_follower",
} as const;

const notificationInclude = {
  actor: {
    select: {
      id: true,
      username: true,
      email: true,
    },
  },
} as const;

export const serializeNotification = (notification: any) => ({
  id: notification.id,
  type: notification.type,
  entity_type: notification.entity_type,
  entity_id: notification.entity_id,
  payload: notification.payload || {},
  read_at: notification.read_at,
  created_at: notification.created_at,
  actor: notification.actor
    ? {
        id: notification.actor.id,
        username: notification.actor.username,
        email: notification.actor.email,
      }
    : null,
});

export const createNotification = async ({
  recipientId,
  actorId,
  type,
  entityType,
  entityId,
  payload,
}: {
  recipientId: string;
  actorId?: string | null;
  type: string;
  entityType?: string | null;
  entityId?: string | null;
  payload?: NotificationPayload;
}) => {
  if (!recipientId) return null;

  return prisma.notification.create({
    data: {
      recipient_id: recipientId,
      actor_id: actorId || null,
      type,
      entity_type: entityType || null,
      entity_id: entityId || null,
      payload: payload || {},
    },
    include: notificationInclude,
  });
};

export const notifyAdmins = async ({
  actorId,
  type,
  entityType,
  entityId,
  payload,
}: {
  actorId?: string | null;
  type: string;
  entityType?: string | null;
  entityId?: string | null;
  payload?: NotificationPayload;
}) => {
  const admins = await prisma.user.findMany({
    where: {
      role: {
        name: "admin",
      },
    },
    select: {
      id: true,
    },
  });

  const recipientIds = admins
    .map((admin) => admin.id)
    .filter((id) => id && id !== actorId);

  if (recipientIds.length === 0) return [];

  await prisma.notification.createMany({
    data: recipientIds.map((recipientId) => ({
      recipient_id: recipientId,
      actor_id: actorId || null,
      type,
      entity_type: entityType || null,
      entity_id: entityId || null,
      payload: payload || {},
    })),
  });

  return prisma.notification.findMany({
    where: {
      recipient_id: { in: recipientIds },
      type,
      entity_type: entityType || null,
      entity_id: entityId || null,
    },
    include: notificationInclude,
    orderBy: { created_at: "desc" },
    take: recipientIds.length,
  });
};

export const getNotificationFeed = async ({
  userId,
  page,
  pageSize,
}: {
  userId: string;
  page: number;
  pageSize: number;
}) => {
  const where = { recipient_id: userId };

  const [total, unreadCount, items] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { ...where, read_at: null } }),
    prisma.notification.findMany({
      where,
      include: notificationInclude,
      orderBy: [
        { read_at: "asc" },
        { created_at: "desc" },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    items: items.map(serializeNotification),
    unreadCount,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      hasMore: page * pageSize < total,
    },
  };
};

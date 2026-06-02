import { api } from "./api";
import type { PaginationMeta } from "./testService";

export type NotificationActor = {
  id: string;
  username: string;
  email: string;
};

export type AppNotification = {
  id: string;
  type: string;
  entity_type?: string | null;
  entity_id?: string | null;
  payload: Record<string, unknown>;
  read_at?: string | null;
  created_at: string;
  actor?: NotificationActor | null;
};

export type NotificationFeed = {
  items: AppNotification[];
  unreadCount: number;
  pagination: PaginationMeta;
};

export const notificationService = {
  list: async (params?: { page?: number; pageSize?: number }): Promise<NotificationFeed> => {
    const response = await api.get("/notifications", { params });
    return response.data;
  },

  markRead: async (id: string): Promise<AppNotification> => {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },

  markAllRead: async (): Promise<{ updated: number }> => {
    const response = await api.post("/notifications/read-all");
    return response.data;
  },
};

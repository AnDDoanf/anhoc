import { api } from './api';
import type { PaginationMeta } from './testService';

export type AdminRole = {
  id: number;
  name: string;
};

export type AdminUser = {
  id: string;
  username: string;
  email: string;
  country?: string | null;
  account_status?: string;
  role: AdminRole;
  created_at: string;
  slots_purchased?: number;
  supervisor_id?: string | null;
  learn_unit_id?: string | null;
  learn_unit?: {
    id: string;
    name: string;
    code: string;
  } | null;
  max_subjects?: number | null;
  max_grades?: number | null;
  max_lessons?: number | null;
  max_templates?: number | null;
  max_teachers?: number | null;
  max_students?: number | null;
  stats?: {
    total_xp?: number | null;
    level?: number | null;
    average_score?: number | string | null;
    last_active?: string | null;
  } | null;
  attempts: number;
  lessons_created: number;
};

export type AdminUserPayload = {
  username: string;
  email: string;
  country?: string;
  password?: string;
  role_name: string;
  slots_purchased?: number;
  learn_unit_name?: string;
  max_subjects?: number | null;
  max_grades?: number | null;
  max_lessons?: number | null;
  max_templates?: number | null;
  max_teachers?: number | null;
  max_students?: number | null;
};

export type AdminSubject = {
  id: number;
  slug: string;
  title_en: string;
  title_vi: string;
  color?: string | null;
  is_classified?: boolean;
};

export type SubjectAccessRequest = {
  id: number;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  reviewed_at?: string | null;
  user: {
    id: string;
    username: string;
    email: string;
    role: AdminRole;
  };
  subject: AdminSubject;
  reviewer?: {
    id: string;
    username: string;
    email: string;
  } | null;
};

export type AdminUserInsights = {
  user: AdminUser;
  summary: {
    attempts: number;
    avgScore: number;
    bestScore: number;
    completedLessons: number;
    totalXp: number;
    level: number;
    lastActive?: string | null;
  };
  bestAttempt?: {
    id: string;
    score: number;
    started_at: string;
    completed_at?: string | null;
    is_practice: boolean;
    lesson?: AdminLessonRef | null;
  } | null;
  recentAttempts: AdminAttemptInsight[];
  mastery: AdminMasteryInsight[];
  achievements: AdminAchievementInsight[];
  xpLogs: AdminXpLog[];
};

export type AdminLessonRef = {
  id: string;
  title_en: string;
  title_vi: string;
};

export type AdminAttemptInsight = {
  id: string;
  total_score: number;
  is_completed?: boolean | null;
  is_practice: boolean;
  started_at: string;
  completed_at?: string | null;
  question_count: number;
  lesson?: AdminLessonRef | null;
};

export type AdminMasteryInsight = {
  lesson_id: string;
  mastery_score: number;
  total_study_time: number;
  total_test_time: number;
  completion_status: string;
  last_activity_at: string;
  lesson?: AdminLessonRef | null;
};

export type AdminAchievementInsight = {
  earned_at: string;
  achievement: {
    id: string;
    slug: string;
    title_en: string;
    title_vi: string;
    category: string;
    xp_reward: number;
    icon?: string | null;
  };
};

export type AdminXpLog = {
  id: string;
  amount: number;
  reason: string;
  occurred_at: string;
};

export type PaginatedItems<T> = {
  items: T[];
  summary?: {
    total: number;
    admins?: number;
    students?: number;
    teachers?: number;
  };
  pagination: PaginationMeta;
};

export const adminService = {
  getStats: async (params?: {
    recentActivityPage?: number;
    recentActivityPageSize?: number;
  }) => {
    const response = await api.get('/admin/stats', { params });
    return response.data;
  },

  listRoles: async (): Promise<AdminRole[]> => {
    const response = await api.get('/admin/roles');
    return response.data;
  },

  listSubjectAccessRequests: async (status = 'pending'): Promise<SubjectAccessRequest[]> => {
    const response = await api.get('/admin/subject-access-requests', { params: { status } });
    return response.data;
  },

  updateSubjectAccessRequest: async (id: number, status: "approved" | "rejected"): Promise<SubjectAccessRequest> => {
    const response = await api.patch(`/admin/subject-access-requests/${id}`, { status });
    return response.data;
  },

  listUsers: async (params?: { search?: string; role?: string; page?: number; pageSize?: number }): Promise<PaginatedItems<AdminUser>> => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  createUser: async (payload: AdminUserPayload): Promise<AdminUser> => {
    const response = await api.post('/admin/users', payload);
    return response.data;
  },

  updateUser: async (id: string, payload: AdminUserPayload): Promise<AdminUser> => {
    const response = await api.patch(`/admin/users/${id}`, payload);
    return response.data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await api.delete(`/admin/users/${id}`);
  },

    getUserInsights: async (id: string): Promise<AdminUserInsights> => {
    const response = await api.get(`/admin/users/${id}/insights`);
    return response.data;
  },

  listStreakRewards: async (): Promise<StreakReward[]> => {
    const response = await api.get<StreakReward[]>('/admin/streak-rewards');
    return response.data;
  },

  createStreakReward: async (payload: StreakRewardPayload): Promise<StreakReward> => {
    const response = await api.post<StreakReward>('/admin/streak-rewards', payload);
    return response.data;
  },

  updateStreakReward: async (id: string, payload: StreakRewardPayload): Promise<StreakReward> => {
    const response = await api.patch<StreakReward>(`/admin/streak-rewards/${id}`, payload);
    return response.data;
  },

  deleteStreakReward: async (id: string): Promise<void> => {
    await api.delete(`/admin/streak-rewards/${id}`);
  }
};

export type StreakReward = {
  id: string;
  name: string;
  description?: string | null;
  reward_type: "milestone" | "specific_day";
  specific_date?: string | null;
  required_days?: number | null;
  reward_payload?: any | null;
  message_en?: string | null;
  message_vi?: string | null;
  is_repeatable: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type StreakRewardPayload = {
  name: string;
  description?: string | null;
  reward_type: "milestone" | "specific_day";
  specific_date?: string | null;
  required_days?: number | null;
  reward_payload?: any | null;
  message_en?: string | null;
  message_vi?: string | null;
  is_repeatable?: boolean;
  is_active?: boolean;
};


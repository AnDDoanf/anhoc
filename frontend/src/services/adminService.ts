import { api } from './api';

export type AdminRole = {
  id: number;
  name: string;
};

export type AdminUser = {
  id: string;
  username: string;
  email: string;
  role: AdminRole;
  created_at: string;
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
  password?: string;
  role_name: string;
};

export type AdminAction = {
  id: number;
  name: string;
};

export type AdminResource = {
  id: number;
  name: string;
};

export type AdminSubject = {
  id: number;
  slug: string;
  title_en: string;
  title_vi: string;
  color?: string | null;
};

export type AdminAccessRole = {
  id: number;
  name: string;
  users: number;
  permissions: Array<{
    id: number;
    action_id: number;
    action: AdminAction;
    resource_id: number;
    resource: AdminResource;
  }>;
  subject_ids: number[];
  subjects: AdminSubject[];
};

export type AdminAccessUser = {
  id: string;
  username: string;
  email: string;
  role: AdminRole;
};

export type AccessControlData = {
  roles: AdminAccessRole[];
  actions: AdminAction[];
  resources: AdminResource[];
  subjects: AdminSubject[];
  users: AdminAccessUser[];
};

export type RolePayload = {
  name: string;
  permissions: Array<{
    action_id: number;
    resource_id: number;
  }>;
  subject_ids: number[];
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

export const adminService = {
  getStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  listRoles: async (): Promise<AdminRole[]> => {
    const response = await api.get('/admin/roles');
    return response.data;
  },

  getAccessControl: async (): Promise<AccessControlData> => {
    const response = await api.get('/admin/access-control');
    return response.data;
  },

  createRole: async (payload: RolePayload): Promise<AdminAccessRole> => {
    const response = await api.post('/admin/roles', payload);
    return response.data;
  },

  updateRole: async (id: number, payload: RolePayload): Promise<AdminAccessRole> => {
    const response = await api.put(`/admin/roles/${id}`, payload);
    return response.data;
  },

  assignUserRole: async (userId: string, roleId: number): Promise<AdminUser> => {
    const response = await api.patch(`/admin/users/${userId}/role`, { role_id: roleId });
    return response.data;
  },

  listUsers: async (params?: { search?: string; role?: string }): Promise<AdminUser[]> => {
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
  }
};

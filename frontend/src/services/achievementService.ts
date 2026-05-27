import { api } from './api';
import type { PaginationMeta } from './testService';

export interface ThemeUnlock {
  id: string;
  slug: string;
  title_en: string;
  title_vi: string;
  description_en: string;
  description_vi: string;
  preview_color: string | null;
  light_variables: Record<string, string>;
  dark_variables: Record<string, string>;
}

export interface Achievement {
  id: string;
  slug: string;
  title_en: string;
  title_vi: string;
  description_en: string;
  description_vi: string;
  category: string;
  xp_reward: number;
  icon: string | null;
  theme: ThemeUnlock | null;
  earned: boolean;
  earned_at: string | null;
}

export interface AchievementListResponse {
  items: Achievement[];
  summary: {
    total: number;
    earned: number;
  };
  pagination: PaginationMeta;
}

export const achievementService = {
  getAll: async (params?: {
    page?: number;
    pageSize?: number;
    category?: string;
  }): Promise<AchievementListResponse> => {
    const response = await api.get('/achievements', { params });
    return response.data;
  },

  getMy: async (): Promise<any[]> => {
    const response = await api.get('/achievements/my');
    return response.data;
  },

  check: async (): Promise<{ newlyEarned: any[] }> => {
    const response = await api.post('/achievements/check');
    return response.data;
  }
};

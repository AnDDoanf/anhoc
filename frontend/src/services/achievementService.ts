import { api } from './api';

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
  earned: boolean;
  earned_at: string | null;
}

export const achievementService = {
  getAll: async (): Promise<Achievement[]> => {
    const response = await api.get('/achievements');
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

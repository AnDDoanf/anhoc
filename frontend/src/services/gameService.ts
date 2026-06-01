import { api } from './api';

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface GameChallenge {
  id: string;
  code: string;
  game_type: 'speed' | 'climb' | 'match' | 'shooter' | 'balance' | 'bubbles';
  is_active?: boolean;
  grade_id?: number | null;
  lesson_id?: string | null;
  created_by: string;
  created_at: string;
  config: {
    questions: Array<{
      template_id: string;
      template_type: string;
      body_template_en: string;
      body_template_vi: string;
      logic_config?: unknown;
      accepted_formulas?: string[];
      generated_variables: Record<string, number>;
      right_answers: string[];
    }>;
  };
  creator: { username: string; email: string };
  grade?: { title_en: string; title_vi: string } | null;
  lesson?: { title_en: string; title_vi: string } | null;
  attempts: Array<{
    id: string;
    user_id: string | null;
    guest_name?: string | null;
    display_name?: string;
    score: number;
    time_spent: number;
    completed_at: string;
    user: { username: string } | null;
  }>;
}

export interface PersonalGameLists {
  activeLimit: number;
  activeCreatedCount: number;
  created: Array<{
    id: string;
    code: string;
    game_type: "speed" | "climb" | "match" | "shooter" | "balance" | "bubbles";
    is_active: boolean;
    created_at: string;
    lesson?: { title_en: string; title_vi: string } | null;
    grade?: { title_en: string; title_vi: string } | null;
    attempt_count: number;
    best_attempt?: {
      score: number;
      time_spent: number;
      completed_at: string;
    } | null;
  }>;
  participated: Array<{
    attempt_id: string;
    challenge_id: string;
    completed_at: string;
    score: number;
    time_spent: number;
    challenge: {
      id: string;
      code: string;
      game_type: "speed" | "climb" | "match" | "shooter" | "balance" | "bubbles";
      is_active: boolean;
      created_at: string;
      creator: { username: string };
      lesson?: { title_en: string; title_vi: string } | null;
      grade?: { title_en: string; title_vi: string } | null;
    };
  }>;
  createdPagination: PaginationMeta;
  participatedPagination: PaginationMeta;
}

export const gameService = {
  getAvailable: async (): Promise<{
    grades: Array<{
      id: number;
      title_en: string;
      title_vi: string;
      lessons: Array<{ id: string; title_en: string; title_vi: string }>;
    }>;
    lessons: Array<{ id: string; title_en: string; title_vi: string }>;
  }> => {
    const response = await api.get('/games/available');
    return response.data;
  },
  createChallenge: async (payload: {
    game_type: string;
    lesson_id?: string | null;
    grade_id?: number | null;
  }): Promise<GameChallenge> => {
    const response = await api.post('/games/challenges', payload);
    return response.data;
  },
  getChallenge: async (code: string): Promise<GameChallenge> => {
    const response = await api.get(`/games/challenges/${code}`);
    return response.data;
  },
  submitAttempt: async (payload: {
    challenge_id: string;
    score: number;
    time_spent: number;
    guest_name?: string;
    guest_token?: string;
  }): Promise<{ attempt: any; xpEarned: number; isGuest?: boolean }> => {
    const response = await api.post('/games/attempts', payload);
    return response.data;
  },
  getGlobalLeaderboard: async (): Promise<{
    speed: Array<{
      id: string;
      score: number;
      time_spent: number;
      completed_at: string;
      guest_name?: string | null;
      user: { username: string } | null;
      challenge: {
        lesson?: { title_en: string; title_vi: string } | null;
        grade?: { title_en: string; title_vi: string } | null;
      };
    }>;
    climb: Array<{
      id: string;
      score: number;
      time_spent: number;
      completed_at: string;
      guest_name?: string | null;
      user: { username: string } | null;
      challenge: {
        lesson?: { title_en: string; title_vi: string } | null;
        grade?: { title_en: string; title_vi: string } | null;
      };
    }>;
    match: Array<{
      id: string;
      score: number;
      time_spent: number;
      completed_at: string;
      guest_name?: string | null;
      user: { username: string } | null;
      challenge: {
        lesson?: { title_en: string; title_vi: string } | null;
        grade?: { title_en: string; title_vi: string } | null;
      };
    }>;
  }> => {
    const response = await api.get('/games/global-leaderboard');
    return response.data;
  },
  getMine: async (params?: {
    createdPage?: number;
    participatedPage?: number;
    pageSize?: number;
  }): Promise<PersonalGameLists> => {
    const response = await api.get('/games/mine', { params });
    return response.data;
  },
  archiveChallenge: async (challengeId: string): Promise<{ success: boolean; alreadyArchived?: boolean }> => {
    const response = await api.patch(`/games/challenges/${challengeId}/archive`);
    return response.data;
  }
};

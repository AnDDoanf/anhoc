import { api } from "./api";

export interface LearnUnitSummary {
  id: string;
  name: string;
  code: string;
  supervisor_id?: string | null;
  max_subjects?: number | null;
  max_grades?: number | null;
  max_lessons?: number | null;
  max_templates?: number | null;
  max_teachers?: number | null;
  max_students?: number | null;
}

export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  avatar_url?: string | null;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  login_id?: string;
  country?: string | null;
  role: string;
  account_status?: string;
  preferred_subject_id?: number | null;
  requires_subject_selection?: boolean;
  permissions: Record<string, string[]>;
  supervisor_id?: string | null;
  learn_unit_id?: string | null;
  learn_unit?: LearnUnitSummary | null;
  slots_purchased?: number;
  oauth_accounts?: Array<{
    id: string;
    provider: string;
    provider_user_id: string;
    created_at: string;
  }>;
}

export interface AuthProfile extends AuthUser {
  preferred_subject?: {
    id: number;
    slug: string;
    title_en: string;
    title_vi: string;
  } | null;
  student_stats?: {
    level?: number | null;
    total_xp?: number | null;
    average_score?: number | string | null;
    lessons_completed?: number | null;
    lives?: number | null;
    last_active?: string | null;
  } | null;
  created_at?: string;
  email_verified_at?: string | null;
  first_login_at?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
  learn_unit_code?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  login_id?: string;
  country?: string;
  role_name?: string;
  learn_unit_name?: string;
}

export interface RegisterResponse {
  message: string;
  userId: string;
  fullName?: string;
  loginId?: string;
  learnUnit?: LearnUnitSummary | null;
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
  refreshToken: string;
}

export interface ActivityPoint {
  date: string;
  xp: number;
}

export interface NearbyLearner {
  id: string;
  username: string;
  country?: string | null;
  level: number;
  total_xp: number;
  average_score: number;
  last_active?: string | null;
  recommendation_score: number;
  is_following: boolean;
}

export interface SocializingData {
  summary: {
    followers: number;
    following: number;
  };
  recommendedUser: NearbyLearner | null;
  nearbyLearners: NearbyLearner[];
}

export const authService = {
  register: async (payload: RegisterRequest): Promise<RegisterResponse> => {
    const response = await api.post<RegisterResponse>("/auth/register", payload);
    return response.data;
  },

  activate: async (token: string) => {
    const response = await api.post("/auth/activate", { token });
    return response.data;
  },

  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>("/auth/login", credentials);

    const { token, refreshToken } = response.data;

    if (token) {
      // 1. Store in LocalStorage for frontend persistence
      localStorage.setItem("token", token);
      if (refreshToken) {
        localStorage.setItem("refreshToken", refreshToken);
      }

      // 2. Set Cookie for your proxy.ts (Middleware)
      // Added Max-Age (7 days) so the cookie persists across browser restarts
      document.cookie = `token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;

      // 3. Set Header for subsequent Axios calls
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }

    return response.data;
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    // Clear cookie by setting expiry to the past
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    delete api.defaults.headers.common["Authorization"];
  },

  getToken: () => {
    return localStorage.getItem("token");
  },

  setAuthHeader: (token: string) => {
    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
  },

  getProfile: async (): Promise<AuthProfile> => {
    const response = await api.get<AuthProfile>("/auth/profile");
    return response.data;
  },

  updatePassword: async (data: any) => {
    const response = await api.patch("/auth/password", data);
    return response.data;
  },

  setSubjectPreference: async (subjectId: number): Promise<LoginResponse & { message: string }> => {
    const response = await api.patch("/auth/subject-preference", { subject_id: subjectId });
    return response.data;
  },

  getActivity: async (): Promise<ActivityPoint[]> => {
    const response = await api.get("/auth/activity");
    return response.data;
  },

  getSocializing: async (): Promise<SocializingData> => {
    const response = await api.get("/auth/socializing");
    return response.data;
  },

  followUser: async (targetUserId: string) => {
    const response = await api.post(`/auth/follow/${targetUserId}`);
    return response.data;
  },

  unfollowUser: async (targetUserId: string) => {
    const response = await api.delete(`/auth/follow/${targetUserId}`);
    return response.data;
  },

  updateUsername: async (username: string) => {
    const response = await api.patch("/auth/username", { username });
    return response.data;
  },

  updateAvatar: async (avatar: string): Promise<{ message: string; avatar_url: string }> => {
    const response = await api.post<{ message: string; avatar_url: string }>("/auth/avatar", { avatar });
    return response.data;
  },

  unlinkProvider: async (provider: string): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/auth/oauth/${provider}`);
    return response.data;
  }
};

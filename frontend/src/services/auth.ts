import { api } from "./api";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    username?: string;
    country?: string | null;
    role: string;
    // Updated to match the grouped object structure we created earlier
    permissions: Record<string, string[]>;
  };
  token: string; // Made required since login usually requires a token
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
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    /** * IMPORTANT: If your baseURL is "http://localhost:5000/api/v1", 
     * use "/auth/login". 
     * If your baseURL is just "http://localhost:5000", 
     * use "/api/v1/auth/login".
     */
    const response = await api.post<LoginResponse>("/auth/login", credentials);

    const { token } = response.data;

    if (token) {
      // 1. Store in LocalStorage for frontend persistence
      localStorage.setItem("token", token);

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
    // Clear cookie by setting expiry to the past
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    delete api.defaults.headers.common["Authorization"];

    // Optional: Redirect to login after logout
    window.location.href = "/login";
  },

  getToken: () => {
    return localStorage.getItem("token");
  },

  setAuthHeader: (token: string) => {
    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
  },

  getProfile: async () => {
    const response = await api.get("/auth/profile");
    return response.data;
  },

  updatePassword: async (data: any) => {
    const response = await api.patch("/auth/password", data);
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
  }
};

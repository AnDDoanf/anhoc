import axios from "axios";

const LOCAL_API_URL = "http://127.0.0.1:5001/api/v1";
const BROWSER_API_URL = "/api/v1";

const normalizeApiBaseUrl = (value: string) => {
  const normalized = value.replace(/\/+$/, "");
  return normalized.endsWith("/api/v1") ? normalized : `${normalized}/api/v1`;
};

const publicApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
const internalApiUrl = process.env.INTERNAL_API_URL?.trim() || process.env.API_URL?.trim();

export const API_BASE_URL = normalizeApiBaseUrl(
  publicApiUrl || BROWSER_API_URL
);

export const SERVER_API_BASE_URL = normalizeApiBaseUrl(
  internalApiUrl || publicApiUrl || LOCAL_API_URL
);

// Helper to construct absolute URLs to backend assets (like user avatars)
export const getBackendUrl = (path: string) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  
  // Extract the base backend URL by stripping `/api/v1`
  const base = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Helper to decode JWT payload safely
const decodeJwt = (token: string) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

let refreshPromise: Promise<string | null> | null = null;

// Auto-attach token and auto-refresh if it's close to expiry
api.interceptors.request.use(async (config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;

      // Check JWT exp claim to see if it expires in less than 60 seconds
      const payload = decodeJwt(token);
      if (payload && payload.exp) {
        const timeRemaining = payload.exp - Date.now() / 1000;
        const refreshToken = localStorage.getItem("refreshToken");
        
        // Refresh token if remaining validity is under 60 seconds
        if (timeRemaining < 60 && refreshToken && config.url !== "/auth/refresh") {
          if (!refreshPromise) {
            refreshPromise = api.post("/auth/refresh", { refreshToken })
              .then((res) => {
                const newToken = res.data.token;
                const newRefreshToken = res.data.refreshToken;
                const newUser = res.data.user;
                localStorage.setItem("token", newToken);
                if (newRefreshToken) {
                  localStorage.setItem("refreshToken", newRefreshToken);
                }
                localStorage.setItem("user", JSON.stringify(newUser));
                
                // Keep document.cookie and Authorization headers in sync
                document.cookie = `token=${newToken}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
                api.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
                
                // Notify listeners of the refreshed credentials
                window.dispatchEvent(
                  new CustomEvent("auth-token-refreshed", {
                    detail: { token: newToken, user: newUser },
                  })
                );
                return newToken;
              })
              .catch((err) => {
                console.error("Token auto-refresh failed:", err);
                return null;
              })
              .finally(() => {
                refreshPromise = null;
              });
          }
          
          const newToken = await refreshPromise;
          if (newToken) {
            config.headers.Authorization = `Bearer ${newToken}`;
          }
        }
      }
    }
  }
  return config;
});

// Intercept 401 Unauthorized or 403 Forbidden responses and notify the app
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      if (typeof window !== "undefined") {
        // Clear local credentials so subsequent pages check roles properly
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
        delete api.defaults.headers.common["Authorization"];

        // Notify global guard to display the relogin modal
        window.dispatchEvent(new CustomEvent("auth-session-expired"));
      }
    }
    return Promise.reject(error);
  }
);

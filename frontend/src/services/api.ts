import axios from "axios";

const LOCAL_API_URL = "http://127.0.0.1:5001/api/v1";

const normalizeApiBaseUrl = (value: string) => {
  const normalized = value.replace(/\/+$/, "");
  return normalized.endsWith("/api/v1") ? normalized : `${normalized}/api/v1`;
};

const publicApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
const internalApiUrl = process.env.INTERNAL_API_URL?.trim() || process.env.API_URL?.trim();

export const API_BASE_URL = normalizeApiBaseUrl(publicApiUrl || "/api/v1");
export const SERVER_API_BASE_URL = normalizeApiBaseUrl(
  internalApiUrl || publicApiUrl || LOCAL_API_URL
);

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
  } catch (e) {
    return null;
  }
};

let isRefreshing = false;

// Auto-attach token and auto-refresh if it's close to expiry
api.interceptors.request.use(async (config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;

      // Check JWT exp claim to see if it expires in less than 24 hours (86400 seconds)
      const payload = decodeJwt(token);
      if (payload && payload.exp) {
        const timeRemaining = payload.exp - Date.now() / 1000;
        
        // Refresh token if remaining validity is under 24 hours
        if (timeRemaining < 86400 && !isRefreshing && config.url !== "/auth/refresh") {
          isRefreshing = true;
          
          api.post("/auth/refresh")
            .then((res) => {
              const newToken = res.data.token;
              const newUser = res.data.user;
              localStorage.setItem("token", newToken);
              localStorage.setItem("user", JSON.stringify(newUser));
              
              // Notify listeners of the refreshed credentials
              window.dispatchEvent(
                new CustomEvent("auth-token-refreshed", {
                  detail: { token: newToken, user: newUser },
                })
              );
            })
            .catch((err) => {
              console.error("Token auto-refresh failed:", err);
            })
            .finally(() => {
              isRefreshing = false;
            });
        }
      }
    }
  }
  return config;
});

// Intercept 401 Unauthorized responses and notify the app
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        // Clear local credentials so subsequent pages check roles properly
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        // Notify global guard to display the relogin modal
        window.dispatchEvent(new CustomEvent("auth-session-expired"));
      }
    }
    return Promise.reject(error);
  }
);

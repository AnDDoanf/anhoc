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

// Auto-attach token if it exists in localStorage
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

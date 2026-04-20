import axios from "axios";

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api/v1";
const normalizedApiUrl = configuredApiUrl.replace(/\/+$/, "");

export const API_BASE_URL = normalizedApiUrl.endsWith("/api/v1")
  ? normalizedApiUrl
  : `${normalizedApiUrl}/api/v1`;

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

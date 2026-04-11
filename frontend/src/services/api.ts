import axios from "axios";

export const api = axios.create({
  // HARDCODE this for now to eliminate environment variable issues
  baseURL: "http://localhost:3001/api/v1", 
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
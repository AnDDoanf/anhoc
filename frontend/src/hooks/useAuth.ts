"use client";

import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
// Update imports to match the fixed slice actions and paths
import { setCredentials, logout as logoutAction } from "@/redux/slices/authSlice";
import { setPermissions, clearPermissions } from "@/redux/slices/permissionSlice";
import { authService, LoginRequest } from "@/services/auth";
import { RootState } from "@/redux/store";
import { useState } from "react";

export const useAuth = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const { user, isAuthenticated, isInitialized } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const persistSession = (response: Awaited<ReturnType<typeof authService.login>>) => {
    localStorage.setItem("user", JSON.stringify(response.user));
    if (response.token) {
      localStorage.setItem("token", response.token);
    }
    if (response.refreshToken) {
      localStorage.setItem("refreshToken", response.refreshToken);
    }

    dispatch(setCredentials({
      user: response.user,
      token: response.token || "",
    }));

    if (response.user.permissions) {
      dispatch(setPermissions(response.user.permissions));
    }
  };

  const login = async (credentials: LoginRequest) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.login(credentials);
      persistSession(response);
      return response;
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        || (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.message
        || "Login failed";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateSession = (response: Awaited<ReturnType<typeof authService.setSubjectPreference>>) => {
    persistSession(response);
  };

  const logout = () => {
    // Clear Cookies and Axios Headers via service
    authService.logout();
    
    // Clear LocalStorage
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    
    // Clear Redux
    dispatch(logoutAction());
    dispatch(clearPermissions());
    
    // Redirect
    router.push("/");
  };

  return {
    user,
    isAuthenticated,
    isInitialized, // Export this so components know when loading is done
    loading,
    error,
    login,
    updateSession,
    logout,
    persistSession,
  };
};

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

  const login = async (credentials: LoginRequest) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.login(credentials);
      
      /**
       * 1. PERSISTENCE: Save to localStorage so the Provider.tsx 
       * can find it on page refresh.
       */
      localStorage.setItem("user", JSON.stringify(response.user));
      if (response.token) {
        localStorage.setItem("token", response.token);
      }

      /**
       * 2. REDUX UPDATE: Update both Auth and Permission slices.
       * We use 'setCredentials' now because it handles the token + user.
       */
      dispatch(setCredentials({ 
        user: response.user, 
        token: response.token || "" 
      }));

      if (response.user.permissions) {
        dispatch(setPermissions(response.user.permissions));
      }

      return response;
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Login failed";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    // Clear Cookies and Axios Headers via service
    authService.logout();
    
    // Clear LocalStorage
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    
    // Clear Redux
    dispatch(logoutAction());
    dispatch(clearPermissions());
    
    // Redirect
    router.push("/login");
  };

  return {
    user,
    isAuthenticated,
    isInitialized, // Export this so components know when loading is done
    loading,
    error,
    login,
    logout,
  };
};
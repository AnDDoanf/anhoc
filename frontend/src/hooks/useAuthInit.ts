"use client";

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { hydrateAuth, logout } from "@/redux/slices/authSlice";
import { hydratePermissions } from "@/redux/slices/permissionSlice";
import { authService } from "@/services/auth";

/**
 * Restores the Redux state from localStorage on app load.
 * This is the "glue" that keeps you logged in after a refresh.
 */
export const useAuthInit = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        
        // 1. Sync Axios Headers
        authService.setAuthHeader(token);
        
        // 2. Restore Auth State (Sets isInitialized to true)
        dispatch(hydrateAuth({ user, token }));
        
        // 3. Restore Permissions State
        if (user.permissions) {
          dispatch(hydratePermissions(user.permissions));
        }
        
        console.log("Auth session restored for:", user.email);
      } catch (e) {
        console.error("Auth initialization failed:", e);
        // If data is corrupted, clear everything
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        dispatch(logout());
      }
    } else {
      // Mark as initialized even if no user exists so the app can show the login page
      dispatch(logout());
    }
  }, [dispatch]);
};
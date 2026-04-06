"use client";

import { Provider } from "react-redux";
import { store } from "./store";
import { ReactNode, useEffect } from "react";
import { hydrateAuth } from "../redux/slices/authSlice";
import { hydratePermissions } from "../redux/slices/permissionSlice";

interface ReduxProviderProps {
  children: ReactNode;
}

export default function ReduxProvider({ children }: ReduxProviderProps) {
  useEffect(() => {
    // 1. Try to get data from localStorage
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        
        // 2. Fill Auth State
        store.dispatch(hydrateAuth({ user, token }));
        
        // 3. Fill Permissions State (assuming they are stored inside the user object)
        if (user.permissions) {
          store.dispatch(hydratePermissions(user.permissions));
        }
      } catch (e) {
        console.error("Failed to hydrate Redux state:", e);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    } else {
      // 4. If no data, we still need to set 'isInitialized' to true 
      // so the RootPage knows it's finished checking
      store.dispatch({ type: "auth/logout" }); 
    }
  }, []);

  return <Provider store={store}>{children}</Provider>;
}
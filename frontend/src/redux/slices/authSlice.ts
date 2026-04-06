import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type User = {
  id: string;
  email: string;
  role: string;
  permissions?: Record<string, string[]>;
};

type AuthState = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean; // CRITICAL: Prevents premature redirects
};

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isInitialized: false, 
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Call this during login
    setCredentials(state, action: PayloadAction<{ user: User; token: string }>) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.isInitialized = true;
    },
    // Call this when the app first loads to hydrate from localStorage
    hydrateAuth(state, action: PayloadAction<{ user: User | null; token: string | null }>) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = !!action.payload.token;
      state.isInitialized = true; // Now the app knows it's safe to redirect
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isInitialized = true;
    },
  },
});

export const { setCredentials, hydrateAuth, logout } = authSlice.actions;
export default authSlice.reducer;
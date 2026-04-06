import { createSlice, PayloadAction } from "@reduxjs/toolkit";

/**
 * Define the structure for grouped permissions.
 * Example: { "student": ["read", "write"], "reports": ["view"] }
 */
export type PermissionGroup = Record<string, string[]>;

type PermissionState = {
  permissions: PermissionGroup;
  isInitialized: boolean;
};

const initialState: PermissionState = {
  permissions: {},
  isInitialized: false,
};

const permissionSlice = createSlice({
  name: "permission",
  initialState,
  reducers: {
    // Call this during login or when fetching user profile
    setPermissions(state, action: PayloadAction<PermissionGroup>) {
      state.permissions = action.payload;
      state.isInitialized = true;
    },
    // Useful for page refreshes to load from localStorage
    hydratePermissions(state, action: PayloadAction<PermissionGroup>) {
      state.permissions = action.payload;
      state.isInitialized = true;
    },
    clearPermissions(state) {
      state.permissions = {};
      state.isInitialized = true;
    },
  },
});

export const { setPermissions, hydratePermissions, clearPermissions } = permissionSlice.actions;
export default permissionSlice.reducer;
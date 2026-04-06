import { configureStore } from "@reduxjs/toolkit";
// Update these paths to match where your files actually are:
import authReducer from "../redux/slices/authSlice"; 
import permissionReducer from "../redux/slices/permissionSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    permission: permissionReducer,
  },
  // Middleware fix: Disable serializableCheck if you plan on storing 
  // complex objects, though for now, the default is fine.
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, 
    }),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
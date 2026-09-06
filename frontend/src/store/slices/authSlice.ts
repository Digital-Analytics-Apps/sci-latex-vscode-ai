import type { PayloadAction } from "@reduxjs/toolkit";
import { createSlice } from "@reduxjs/toolkit";

export type UserRole =
  "AUTHOR" | "REVIEWER" | "COORDINATOR" | "MANAGER" | "ADMIN";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
}

const rawToken = localStorage.getItem("token");
const initialToken =
  rawToken && rawToken !== "undefined" && rawToken !== "null" ? rawToken : null;

const rawUser = localStorage.getItem("user");
const initialUser =
  rawUser && rawUser !== "undefined" && rawUser !== "null"
    ? JSON.parse(rawUser)
    : null;

const initialState: AuthState = {
  token: initialToken,
  user: initialUser,
  isAuthenticated: Boolean(initialToken),
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ token: string; user: User }>,
    ) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      localStorage.setItem("token", action.payload.token);
      localStorage.setItem("user", JSON.stringify(action.payload.user));
    },
    logout: (state) => {
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;

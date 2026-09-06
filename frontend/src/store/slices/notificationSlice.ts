import type { PayloadAction } from "@reduxjs/toolkit";
import { createSlice } from "@reduxjs/toolkit";

export type AlertSeverity = "success" | "error" | "warning" | "info";

interface NotificationState {
  open: boolean;
  message: string;
  severity: AlertSeverity;
}

const initialState: NotificationState = {
  open: false,
  message: "",
  severity: "info",
};

export const notificationSlice = createSlice({
  name: "notification",
  initialState,
  reducers: {
    showNotification: (
      state,
      action: PayloadAction<{ message: string; severity?: AlertSeverity }>,
    ) => {
      state.open = true;
      state.message = action.payload.message;
      state.severity = action.payload.severity || "info";
    },
    hideNotification: (state) => {
      state.open = false;
    },
  },
});

export const { showNotification, hideNotification } = notificationSlice.actions;
export default notificationSlice.reducer;

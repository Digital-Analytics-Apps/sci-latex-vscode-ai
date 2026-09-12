import { configureStore } from "@reduxjs/toolkit";
import articleReducer from "./slices/articleSlice";
import authReducer from "./slices/authSlice";
import notificationReducer from "./slices/notificationSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    notification: notificationReducer,
    article: articleReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

import { Alert, Snackbar } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { Provider, useDispatch, useSelector } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./routes";
import { type RootState, store } from "./store";
import { hideNotification } from "./store/slices/notificationSlice";
import { ThemeContextProvider } from "./theme";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const GlobalNotificationSnackbar: React.FC = () => {
  const dispatch = useDispatch();
  const { open, message, severity } = useSelector(
    (state: RootState) => state.notification,
  );

  return (
    <Snackbar
      open={open}
      autoHideDuration={4000}
      onClose={() => dispatch(hideNotification())}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    >
      <Alert
        onClose={() => dispatch(hideNotification())}
        severity={severity}
        variant="filled"
      >
        {message}
      </Alert>
    </Snackbar>
  );
};

export function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeContextProvider>
          <BrowserRouter>
            <AppRoutes />
            <GlobalNotificationSnackbar />
          </BrowserRouter>
        </ThemeContextProvider>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;

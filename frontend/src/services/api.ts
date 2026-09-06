import axios from "axios";
import { store } from "../store";
import { logout } from "../store/slices/authSlice";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3333/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor de Requisição: Adiciona o cabeçalho Authorization se o token existir
api.interceptors.request.use(
  (config) => {
    const token = store.getState().auth.token || localStorage.getItem("token");
    if (token && token !== "undefined" && token !== "null") {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Interceptor de Resposta: Trata expiração/invalidade de token JWT
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      store.dispatch(logout());
    }
    return Promise.reject(error);
  },
);

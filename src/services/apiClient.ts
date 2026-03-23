import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";

let tokenGetter: (() => string | null) | null = null;

export const bindAuthTokenGetter = (getter: () => string | null) => {
  tokenGetter = getter;
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = tokenGetter?.();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

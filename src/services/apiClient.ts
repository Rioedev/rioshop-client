import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";
// When VITE_API_BASE_URL is an empty string (production same-origin build),
// axios baseURL becomes "" → calls go to current origin. Useful for ngrok / unified host.

let tokenGetter: (() => string | null) | null = null;

export const bindAuthTokenGetter = (getter: () => string | null) => {
  tokenGetter = getter;
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    // Bỏ qua trang cảnh báo của ngrok-free khi gọi API
    "ngrok-skip-browser-warning": "true",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = tokenGetter?.();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

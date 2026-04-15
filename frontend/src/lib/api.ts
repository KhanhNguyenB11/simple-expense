import axios from "axios";
import config from "./config";

// Requests are relative to the current origin so Next.js rewrites (next.config.mjs)
// proxy /api/* to the backend. withCredentials ensures the HTTP-only JWT cookie
// is sent automatically on every request — no manual token handling needed.
const api = axios.create({
  baseURL: config.apiUrl,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

export default api;

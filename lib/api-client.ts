import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for better-auth cookies/session
  headers: {
    "Content-Type": "application/json",
  },
});

// Intercept requests to inject the token from cookies (for cross-origin requests)
apiClient.interceptors.request.use((config) => {
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(new RegExp('(^| )better-auth\\.session_token=([^;]+)'));
    if (match && match[2]) {
      config.headers.Authorization = `Bearer ${match[2]}`;
    }
  }
  return config;
});

// Optionally add interceptors here for handling 401s globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // If not authenticated, we could redirect to login for admin/staff
    return Promise.reject(error);
  }
);

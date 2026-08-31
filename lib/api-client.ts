import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for better-auth cookies/session
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // If not authenticated, we could redirect to login for admin/staff
    return Promise.reject(error);
  }
);

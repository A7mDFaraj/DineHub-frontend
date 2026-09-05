import axios from "axios";
import { installBearerAuth } from "./auth-token";
import { installAxiosObservability } from "./observability";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://dinehub-backend-42eq.onrender.com/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  withCredentials: true, // Important for better-auth cookies/session
});

installBearerAuth(apiClient);
installAxiosObservability(apiClient);

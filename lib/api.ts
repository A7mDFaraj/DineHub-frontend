import axios from "axios";
import { installBearerAuth } from "./auth-token";
import { installAxiosObservability } from "./observability";

const isServer = typeof window === "undefined";
const API_BASE_URL = isServer
  ? process.env.BACKEND_INTERNAL_URL || "https://dinehub-backend-42eq.onrender.com/api"
  : process.env.NEXT_PUBLIC_API_URL || "/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Ensures auth cookies are sent with every request
  headers: {
    "Content-Type": "application/json",
  },
});

installBearerAuth(api);
installAxiosObservability(api);

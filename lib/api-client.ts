import axios from "axios";
import { installAxiosObservability } from "./observability";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for better-auth cookies/session
});

installAxiosObservability(apiClient);

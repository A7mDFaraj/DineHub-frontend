import axios from "axios";

export function apiErrorMessage(error: unknown): string | undefined {
  if (!axios.isAxiosError<{ message?: unknown }>(error)) return undefined;
  const message = error.response?.data?.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && message.every((part) => typeof part === "string")) return message.join(" · ");
  return undefined;
}

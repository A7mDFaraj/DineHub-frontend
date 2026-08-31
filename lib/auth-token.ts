import type { AxiosInstance } from "axios";

const AUTH_TOKEN_STORAGE_KEY = "dinehub.auth-token";

let inMemoryAuthToken: string | undefined;

export function getAuthToken(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    const storedToken = window.sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (storedToken) {
      inMemoryAuthToken = storedToken;
    }
  } catch {
    // Some privacy modes can deny storage access. The in-memory fallback still
    // keeps authentication working until the current document is closed.
  }

  return inMemoryAuthToken;
}

export function storeAuthToken(token: string): void {
  const normalizedToken = token.trim();
  if (!normalizedToken || typeof window === "undefined") {
    return;
  }

  inMemoryAuthToken = normalizedToken;

  try {
    window.sessionStorage.setItem(AUTH_TOKEN_STORAGE_KEY, normalizedToken);
  } catch {
    // Keep the in-memory token when privacy settings disable sessionStorage.
  }
}

export function clearAuthToken(): void {
  inMemoryAuthToken = undefined;

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    // The token has already been removed from memory.
  }
}

export function installBearerAuth(client: AxiosInstance): void {
  client.interceptors.request.use((config) => {
    const token = getAuthToken();

    if (token && !config.headers.has("Authorization")) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }

    return config;
  });
}

import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";

type ClientLogLevel = "warn" | "error";

interface ClientIncident {
  level: ClientLogLevel;
  event: string;
  message: string;
  stack?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "https://dinehub-backend-42eq.onrender.com/api").replace(/\/$/, "");
const CLIENT_LOG_ENDPOINT = `${API_BASE_URL}/logs/client`;
const recentIncidents = new Map<string, number>();
const installedClients = new WeakSet<AxiosInstance>();
let browserListenersInstalled = false;

function truncate(value: string | undefined, maximum: number): string | undefined {
  if (!value) return undefined;
  return value.length <= maximum ? value : `${value.slice(0, maximum)}…`;
}

function safePath(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value, window.location.origin).pathname;
  } catch {
    return value.split(/[?#]/, 1)[0].slice(0, 500);
  }
}

function createRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `web-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function requestIdFromConfig(config?: InternalAxiosRequestConfig): string | undefined {
  const value = config?.headers?.get?.("x-request-id");
  return typeof value === "string" ? value : undefined;
}

function incidentFingerprint(incident: ClientIncident): string {
  return `${incident.event}|${incident.message}|${safePath(window.location.href)}`;
}

export function reportClientIncident(incident: ClientIncident): void {
  if (typeof window === "undefined") return;

  try {
    const fingerprint = incidentFingerprint(incident);
    const now = Date.now();
    const previous = recentIncidents.get(fingerprint);
    if (previous && now - previous < 10_000) return;

    recentIncidents.set(fingerprint, now);
    if (recentIncidents.size > 100) {
      for (const [key, timestamp] of recentIncidents) {
        if (now - timestamp > 60_000) recentIncidents.delete(key);
      }
    }

    const payload = JSON.stringify({
      level: incident.level,
      event: truncate(incident.event, 80),
      message: truncate(incident.message, 1000),
      stack: truncate(incident.stack, 8000),
      requestId: truncate(incident.requestId, 128),
      path: safePath(window.location.href),
      metadata: incident.metadata,
    });

    void fetch(CLIENT_LOG_ENDPOINT, {
      method: "POST",
      credentials: "include",
      keepalive: true,
      headers: { "content-type": "application/json" },
      body: payload,
    }).catch(() => undefined);
  } catch {
    // Monitoring must never break the customer or admin experience.
  }
}

function axiosIncident(error: AxiosError): ClientIncident {
  const status = error.response?.status;
  const config = error.config as InternalAxiosRequestConfig | undefined;
  const endpoint = safePath(config?.url);
  const isServerFailure = typeof status === "number" && status >= 500;

  return {
    level: isServerFailure || !error.response ? "error" : "warn",
    event: error.response ? "api.response_error" : "api.network_error",
    message: error.message || "Frontend API request failed",
    stack: error.stack,
    requestId: requestIdFromConfig(config),
    metadata: {
      errorName: error.name,
      code: error.code,
      method: config?.method?.toUpperCase(),
      endpoint,
      statusCode: status,
    },
  };
}

export function installAxiosObservability(client: AxiosInstance): void {
  if (installedClients.has(client)) return;
  installedClients.add(client);

  client.interceptors.request.use((config) => {
    if (!config.headers.has("x-request-id")) {
      config.headers.set("x-request-id", createRequestId());
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      if (typeof window !== "undefined" && error && typeof error === "object" && "isAxiosError" in error) {
        reportClientIncident(axiosIncident(error as AxiosError));
      }
      return Promise.reject(error);
    },
  );
}

function reasonToError(reason: unknown): Error {
  if (reason instanceof Error) return reason;
  if (typeof reason === "string") return new Error(reason);
  try {
    return new Error(JSON.stringify(reason));
  } catch {
    return new Error("Unhandled promise rejection");
  }
}

export function installBrowserObservability(): void {
  if (typeof window === "undefined" || browserListenersInstalled) return;
  browserListenersInstalled = true;

  window.addEventListener("error", (event) => {
    const error = event.error instanceof Error ? event.error : new Error(event.message || "Browser resource error");
    const target = event.target instanceof HTMLElement ? event.target : null;
    const resourceUrl = target instanceof HTMLImageElement
      ? target.currentSrc
      : target instanceof HTMLScriptElement
        ? target.src
        : undefined;

    reportClientIncident({
      level: "error",
      event: event.error ? "window.error" : "resource.error",
      message: error.message,
      stack: error.stack,
      metadata: {
        errorName: error.name,
        file: safePath(event.filename),
        line: event.lineno || undefined,
        column: event.colno || undefined,
        resource: safePath(resourceUrl),
      },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const error = reasonToError(event.reason);
    reportClientIncident({
      level: "error",
      event: "promise.unhandled_rejection",
      message: error.message,
      stack: error.stack,
      metadata: { errorName: error.name },
    });
  });
}

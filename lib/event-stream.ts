import { API_BASE_URL } from "./api-client";
import { getAuthToken } from "./auth-token";
import { openEventStream, type StreamEvent } from "./sse-client";
export type { StreamEvent } from "./sse-client";

export function subscribeToEvents(path: string, onEvent: (event: StreamEvent) => void) {
  return openEventStream((signal) => {
    const token = getAuthToken();
    return fetch(API_BASE_URL + path, {
      credentials: "include",
      headers: { Accept: "text/event-stream", ...(token ? { Authorization: "Bearer " + token } : {}) },
      cache: "no-store",
      signal,
    });
  }, onEvent);
}

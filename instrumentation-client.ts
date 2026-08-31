import { installBrowserObservability } from "./lib/observability";

try {
  installBrowserObservability();
} catch {
  // Client instrumentation must never stop hydration.
}

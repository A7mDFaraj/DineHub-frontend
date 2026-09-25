export type StreamEvent = { id?: string; type: string; data?: unknown };

// Notifications are hints. Every connection triggers an authoritative refresh.
export function openEventStream(
  connect: (signal: AbortSignal) => Promise<Response>,
  onEvent: (event: StreamEvent) => void,
) {
  const lifetime = new AbortController();
  void run();
  return () => lifetime.abort();

  async function run() {
    let retryMs = 1_000;
    while (!lifetime.signal.aborted) {
      const connection = new AbortController();
      const abort = () => connection.abort();
      lifetime.signal.addEventListener("abort", abort, { once: true });
      let watchdog: ReturnType<typeof setTimeout>;
      const touch = () => {
        clearTimeout(watchdog);
        watchdog = setTimeout(abort, 45_000);
      };
      let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
      try {
        touch();
        const response = await connect(connection.signal);
        if ([401, 403, 404].includes(response.status)) {
          onEvent({ type: "unavailable", data: { status: response.status } });
          return;
        }
        if (!response.ok || !response.body || !response.headers.get("content-type")?.includes("text/event-stream")) {
          throw new Error("Invalid event stream response");
        }
        reader = response.body.getReader();
        onEvent({ type: "connected" });
        const decoder = new TextDecoder();
        let buffer = "";
        while (!lifetime.signal.aborted) {
          const { value, done } = await reader.read();
          if (done) break;
          touch();
          retryMs = 1_000;
          buffer += decoder.decode(value, { stream: true });
          // Normalize after concatenation: CRLF may be split across chunks.
          buffer = buffer.replace(/\r\n/g, "\n");
          if (buffer.length > 65_536) throw new Error("Oversized event frame");
          let boundary = buffer.indexOf("\n\n");
          while (boundary >= 0) {
            const event = parseEvent(buffer.slice(0, boundary));
            buffer = buffer.slice(boundary + 2);
            if (event) onEvent(event);
            boundary = buffer.indexOf("\n\n");
          }
        }
      } catch {
        if (lifetime.signal.aborted) return;
      } finally {
        clearTimeout(watchdog!);
        connection.abort();
        await reader?.cancel().catch(() => undefined);
        reader?.releaseLock();
        lifetime.signal.removeEventListener("abort", abort);
      }
      await delay(retryMs, lifetime.signal);
      retryMs = Math.min(30_000, retryMs * 2);
    }
  }
}

function parseEvent(block: string): StreamEvent | undefined {
  let id: string | undefined;
  let type = "message";
  const data: string[] = [];
  for (const line of block.split("\n")) {
    if (line.startsWith("id:")) id = line.slice(3).trimStart();
    else if (line.startsWith("event:")) type = line.slice(6).trimStart();
    else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
  }
  if (!data.length) return undefined;
  const raw = data.join("\n");
  try { return { id, type, data: JSON.parse(raw) }; }
  catch { return { id, type, data: raw }; }
}

function delay(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) return resolve();
    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const timer = setTimeout(finish, milliseconds);
    signal.addEventListener("abort", finish, { once: true });
  });
}

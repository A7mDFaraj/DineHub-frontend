import type { OcrLine } from "./parser";

export type Crop = { left: number; top: number; width: number; height: number };
export const FULL_CROP: Crop = { left: 0, top: 0, width: 100, height: 100 };

export async function preparePhoto(
  file: File,
  rotation: number,
  crop: Crop,
): Promise<Blob> {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 15 * 1024 * 1024
  )
    throw new Error("file");
  if (
    ![crop.left, crop.top, crop.width, crop.height].every(Number.isFinite) ||
    crop.left < 0 ||
    crop.top < 0 ||
    crop.width < 5 ||
    crop.height < 5 ||
    crop.left + crop.width > 100 ||
    crop.top + crop.height > 100
  )
    throw new Error("crop");
  const image = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  try {
    if (
      image.width * image.height > 40_000_000 ||
      Math.min(image.width, image.height) < 100
    )
      throw new Error("dimensions");
    const sideways = rotation % 180 !== 0;
    const rw = sideways ? image.height : image.width;
    const rh = sideways ? image.width : image.height;
    const cw = (rw * crop.width) / 100,
      ch = (rh * crop.height) / 100;
    const scale = Math.min(1, 2800 / Math.max(cw, ch));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(cw * scale);
    canvas.height = Math.round(ch * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas");
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.scale(scale, scale);
    context.translate((-rw * crop.left) / 100, (-rh * crop.top) / 100);
    context.translate(rw / 2, rh / 2);
    context.rotate((rotation * Math.PI) / 180);
    context.drawImage(image, -image.width / 2, -image.height / 2);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("decode"))),
        "image/png",
      ),
    );
  } finally {
    image.close();
  }
}

export async function recognizePhoto(
  image: Blob,
  language: "ara" | "eng" | "ara+eng",
  signal: AbortSignal,
  progress: (value: number) => void,
): Promise<OcrLine[]> {
  const { createWorker, PSM } = await import("tesseract.js");
  if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
  let worker: Awaited<ReturnType<typeof createWorker>> | undefined;
  let nativeWorker: { terminate: () => void } | undefined;
  let stopped = false;
  let rejectStopped: (error: Error) => void = () => {};
  const cancelled = new Promise<never>((_, reject) => {
    rejectStopped = reject;
  });
  const stop = (reason: Error) => {
    stopped = true;
    nativeWorker?.terminate();
    rejectStopped(reason);
  };
  const abort = () => stop(new DOMException("Cancelled", "AbortError"));
  signal.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => stop(new Error("timeout")), 180_000);
  try {
    const job = (async () => {
      if (stopped) throw new DOMException("Cancelled", "AbortError");
      worker = await createWorker(language, 1, {
        // Patched callback exposes the worker before initialization/downloads.
        onWorker: (created) => {
          nativeWorker = created;
          if (stopped) created.terminate();
        },
        // Versions are pinned. Only model/runtime assets cross the network, never photos.
        workerPath:
          "https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/worker.min.js",
        corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0",
        langPath:
          "https://raw.githubusercontent.com/tesseract-ocr/tessdata/ced78752cc61322fb554c280d13360b35b8684e4",
        gzip: false,
        cachePath: "dinehub-tessdata-ced78752",
        logger: (message) => {
          if (!stopped)
            progress(
              message.status === "recognizing text"
                ? 30 + Math.round(message.progress * 70)
                : Math.round(message.progress * 25),
            );
        },
        // Handle worker errors as promise rejections instead of uncaught exceptions.
        errorHandler: (error) => stop(new Error(String(error))),
      });
      if (stopped) {
        await worker.terminate();
        throw new DOMException("Cancelled", "AbortError");
      }
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO,
        preserve_interword_spaces: "1",
      });
      const { data } = await worker.recognize(
        image,
        {},
        { text: true, blocks: true },
      );
      return (
        data.blocks?.flatMap((block) =>
          block.paragraphs.flatMap((p) =>
            p.lines.map((line) => ({
              text: line.text,
              confidence: line.confidence,
              bbox: line.bbox,
            })),
          ),
        ) ??
        data.text
          .split("\n")
          .filter(Boolean)
          .map((text) => ({ text, confidence: 0 }))
      );
    })();
    return await Promise.race([job, cancelled]);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
    stopped = true;
    nativeWorker?.terminate();
    if (worker) await worker.terminate().catch(() => {});
    // A worker that finishes initialization after cancellation is terminated in job.
  }
}

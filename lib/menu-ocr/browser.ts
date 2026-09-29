import { normalizeDigits, type OcrLine } from "./parser";

export type Crop = { left: number; top: number; width: number; height: number };
export const FULL_CROP: Crop = { left: 0, top: 0, width: 100, height: 100 };
export type MenuLayout = "auto" | "1" | "2" | "3";

async function photoColumns(image: Blob, layout: MenuLayout) {
  const bitmap = await createImageBitmap(image);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("canvas");
    context.drawImage(bitmap, 0, 0);
    let cuts: number[] = [];
    if (layout !== "auto") {
      cuts = Array.from({ length: Number(layout) - 1 }, (_, i) => Math.round(bitmap.width * (i + 1) / Number(layout)));
    } else if (bitmap.width > bitmap.height * 1.25) {
      // Find sustained vertical whitespace in the body, excluding banners.
      // Row-relative contrast also works on gray paper / uneven exposure.
      const { data } = context.getImageData(0, 0, bitmap.width, bitmap.height);
      const ink = new Array<number>(bitmap.width).fill(0);
      let rows = 0, activeRows = 0;
      for (let y = Math.round(bitmap.height * 0.2); y < bitmap.height * 0.82; y += 3) {
        const luminance = (x: number) => {
          const offset = (y * bitmap.width + x) * 4;
          return data[offset] * 0.299 + data[offset + 1] * 0.587 + data[offset + 2] * 0.114;
        };
        const samples = Array.from({ length: Math.ceil(bitmap.width / 8) }, (_, i) => luminance(Math.min(bitmap.width - 1, i * 8))).sort((a, b) => a - b);
        const threshold = samples[Math.floor(samples.length * 0.8)] - 40;
        let rowInk = 0;
        for (let x = 0; x < bitmap.width; x++) if (luminance(x) < threshold) { ink[x]++; rowInk++; }
        if (rowInk > bitmap.width * 0.005) activeRows++;
        rows++;
      }
      const gaps: { center: number; width: number }[] = [];
      let start = -1;
      for (let x = 0; x <= bitmap.width; x++) {
        if (x < bitmap.width && ink[x] <= rows * 0.015) { if (start < 0) start = x; }
        else if (start >= 0) {
          if (start > 0 && x < bitmap.width && activeRows > rows * 0.2 && x - start >= bitmap.width * 0.025)
            gaps.push({ center: (x + start) / 2, width: x - start });
          start = -1;
        }
      }
      for (const gap of gaps.sort((a, b) => b.width - a.width)) {
        const boundaries = [0, ...cuts, bitmap.width];
        if (boundaries.every((x) => Math.abs(x - gap.center) >= bitmap.width * 0.24)) cuts.push(Math.round(gap.center));
        if (cuts.length === 2) break;
      }
      cuts.sort((a, b) => a - b);
    }
    const edges = [0, ...cuts, bitmap.width];
    const sections: { image: Blob; x: number; scale: number }[] = [];
    for (let i = 0; i < edges.length - 1; i++) {
      const section = document.createElement("canvas");
      // Small menu print benefits from upscaling before LSTM recognition.
      const width = edges[i + 1] - edges[i];
      const scale = Math.min(bitmap.height < 650 ? 2 : 1, 2800 / Math.max(width, bitmap.height));
      section.width = Math.round(width * scale);
      section.height = Math.round(bitmap.height * scale);
      const sectionContext = section.getContext("2d")!;
      sectionContext.imageSmoothingQuality = "high";
      sectionContext.drawImage(canvas, edges[i], 0, width, bitmap.height, 0, 0, section.width, section.height);
      const blob = await new Promise<Blob>((resolve, reject) => section.toBlob((b) => b ? resolve(b) : reject(new Error("decode")), "image/png"));
      sections.push({ image: blob, x: edges[i], scale });
    }
    return sections;
  } finally { bitmap.close(); }
}

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
  layout: MenuLayout = "auto",
): Promise<OcrLine[]> {
  const { createWorker, PSM } = await import("tesseract.js");
  if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
  let worker: Awaited<ReturnType<typeof createWorker>> | undefined;
  let nativeWorker: { terminate: () => void } | undefined;
  let stopped = false;
  let sectionIndex = 0, sectionCount = 1, lastProgress = 0;
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
      const sections = await photoColumns(image, layout);
      sectionCount = sections.length * (language === "ara+eng" ? 2 : 1);
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
          if (!stopped) {
            lastProgress = Math.max(lastProgress,
              message.status === "recognizing text"
                ? 30 + Math.round((sectionIndex + message.progress) / sectionCount * 70)
                : Math.round(message.progress * 25),
            );
            progress(lastProgress);
          }
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
      type Word = { text: string; confidence: number; bbox: NonNullable<OcrLine["bbox"]> };
      const lines: (OcrLine & { words?: Word[] })[] = [];
      for (const section of sections) {
        if (stopped) throw new DOMException("Cancelled", "AbortError");
        const { data } = await worker.recognize(
        section.image,
        {},
        { text: true, blocks: true },
      );
      lines.push(...(
        data.blocks?.flatMap((block) =>
          block.paragraphs.flatMap((p) =>
            p.lines.map((line) => ({
              text: line.text,
              confidence: line.confidence,
              column: sectionIndex,
              words: line.words.map((word) => ({ text: word.text, confidence: word.confidence,
                bbox: { x0: word.bbox.x0 / section.scale + section.x, x1: word.bbox.x1 / section.scale + section.x,
                  y0: word.bbox.y0 / section.scale, y1: word.bbox.y1 / section.scale } })),
              bbox: { x0: line.bbox.x0 / section.scale + section.x, x1: line.bbox.x1 / section.scale + section.x,
                y0: line.bbox.y0 / section.scale, y1: line.bbox.y1 / section.scale },
            })),
          ),
        ) ??
        data.text
          .split("\n")
          .filter(Boolean)
          .map((text) => ({ text, confidence: 0, column: sectionIndex }))
      ));
      sectionIndex++;
      }
      if (language === "ara+eng") {
        // Arabic recognition sometimes truncates Western decimals (16.00 -> 0).
        // Cross-check decimal glyphs with the English model at the SAME location;
        // never borrow a value from another row or infer a price from calories.
        await worker.reinitialize("eng", 1);
        await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO, preserve_interword_spaces: "1" });
        for (const [column, section] of sections.entries()) {
          if (stopped) throw new DOMException("Cancelled", "AbortError");
          const { data } = await worker.recognize(section.image, {}, { blocks: true, text: false });
          const words = data.blocks?.flatMap((b) => b.paragraphs.flatMap((p) => p.lines.flatMap((l) => l.words))) ?? [];
          for (const word of words) {
            const number = normalizeDigits(word.text).replace(/[\u200e\u200f\u202a-\u202e]/g, "");
            if (!/^\d+[.,]\d{2}$/.test(number) || word.confidence < 70) continue;
            const box = { x0: word.bbox.x0 / section.scale + section.x, x1: word.bbox.x1 / section.scale + section.x,
              y0: word.bbox.y0 / section.scale, y1: word.bbox.y1 / section.scale };
            for (const line of lines.filter((l) => l.column === column && l.words)) {
              let corrected = false;
              for (const original of line.words!) {
                const b = original.bbox;
                const overlapX = Math.min(b.x1, box.x1) - Math.max(b.x0, box.x0);
                const overlapY = Math.min(b.y1, box.y1) - Math.max(b.y0, box.y0);
                if (overlapX > Math.min(b.x1 - b.x0, box.x1 - box.x0) * 0.8 && overlapY > (box.y1 - box.y0) * 0.5 &&
                  /^\s*[\d.,٠-٩۰-۹٫٬\u200e\u200f\u202a-\u202e]+\s*$/.test(original.text) && normalizeDigits(original.text) !== number) {
                  original.text = number;
                  corrected = true;
                }
              }
              if (corrected) { line.text = line.words!.map((w) => w.text).join(" "); line.confidence = Math.min(line.confidence, 79); }
            }
          }
          sectionIndex++;
        }
      }
      return lines;
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

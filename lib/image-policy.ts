export const imageRemotePatterns = [
  { protocol: "https" as const, hostname: "dinehub-backend-42eq.onrender.com", port: "", pathname: "/uploads/**" },
];
if (process.env.NEXT_PUBLIC_IMAGE_ORIGIN) {
  const origin = new URL(process.env.NEXT_PUBLIC_IMAGE_ORIGIN);
  if (origin.protocol !== "https:") throw new Error("NEXT_PUBLIC_IMAGE_ORIGIN must use HTTPS");
  imageRemotePatterns.push({ protocol: "https", hostname: origin.hostname, port: origin.port, pathname: "/**" });
}

export function canOptimizeImage(src: string): boolean {
  if (src.startsWith("/") && !src.startsWith("//")) return true;
  try {
    const url = new URL(src);
    return imageRemotePatterns.some(pattern => url.protocol === pattern.protocol + ":" &&
      url.hostname === pattern.hostname && url.port === pattern.port &&
      (pattern.pathname === "/**" || url.pathname.startsWith("/uploads/")));
  } catch { return false; }
}

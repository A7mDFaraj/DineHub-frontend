// Match the backend's durable image URL requirement for both logos and products.
export function isValidImageUrl(value: string): boolean {
  if (!value.trim()) return true;
  if (value.trim().length > 2048) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && !!url.hostname && !url.username && !url.password;
  } catch {
    return false;
  }
}

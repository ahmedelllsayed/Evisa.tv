/** Allows only same-site paths. Blocks protocol-relative, backslash, and scheme redirects. */
export function safeNextPath(next: string | null | undefined, fallback: string) {
  if (!next) return fallback;
  const value = next.trim();
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.includes("://") || value.includes("\0")) {
    return fallback;
  }
  if (/%5c|%2f%2f|%00/i.test(value)) return fallback;
  return value;
}

/** Accepts an internal path or an http(s) URL. Anything else becomes an empty string. */
export function safePublicUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.includes("\\") && !trimmed.includes("://")) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
  } catch {
    return "";
  }
  return "";
}

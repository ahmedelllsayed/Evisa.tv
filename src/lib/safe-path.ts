const CONTROL = /[\u0000-\u001F\u007F]/;
const ENCODED_CONTROL = /%(?:0[0-9a-f]|1[0-9a-f]|7f)/i;

/** Allows only same-site paths. Blocks protocol-relative, backslash, control-character, and scheme redirects. */
export function safeNextPath(next: string | null | undefined, fallback: string) {
  if (!next) return fallback;
  const value = next.trim();
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.includes("\\") || value.includes("://") || CONTROL.test(value) || ENCODED_CONTROL.test(value)) return fallback;
  if (/%5c|%2f%2f/i.test(value)) return fallback;
  let url: URL;
  try {
    url = new URL(value, "https://evisa.tv");
  } catch {
    return fallback;
  }
  if (url.origin !== "https://evisa.tv" || url.username || url.password) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
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

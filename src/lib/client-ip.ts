import { headers } from "next/headers";

/** The proxy sets x-real-ip from the connection; the first x-forwarded-for entry can be supplied by the client. */
export async function clientIp() {
  const store = await headers();
  const real = store.get("x-real-ip")?.trim();
  if (real) return real;
  return (store.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "unknown";
}

"use client";

import { funnelName } from "@/lib/funnel";

type Params = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function track(event: string, params: Params = {}) {
  if (typeof window === "undefined") return;
  if (typeof window.gtag === "function") window.gtag("event", event, params);
  const name = funnelName(event);
  if (!name) return;
  const slug = typeof params.item_id === "string" ? params.item_id : "";
  const locale = document.documentElement.lang === "ar" ? "ar-EG" : "en-EG";
  void fetch("/api/funnel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, slug, locale }),
    keepalive: true,
  }).catch(() => undefined);
}

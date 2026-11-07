"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const POLL_MS = 8000;

/** Realtime when Supabase is configured; polling only while the tab is visible and `live` is true. */
export function useLiveApplication(applicationId: string, live = true) {
  const router = useRouter();
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      ?.channel(`app-${applicationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "applications", filter: `id=eq.${applicationId}` },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "application_events", filter: `application_id=eq.${applicationId}` },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      channel?.unsubscribe();
    };
  }, [applicationId, router]);

  useEffect(() => {
    if (!live) return;
    let timer: number | undefined;
    const stop = () => {
      if (timer !== undefined) window.clearInterval(timer);
      timer = undefined;
    };
    const start = () => {
      stop();
      timer = window.setInterval(() => router.refresh(), POLL_MS);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
        start();
      } else stop();
    };
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [live, router]);
}

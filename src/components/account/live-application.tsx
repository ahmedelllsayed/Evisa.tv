"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function useLiveApplication(applicationId: string) {
  const router = useRouter();
  useEffect(() => {
    const poll = setInterval(() => router.refresh(), 8000);
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
      clearInterval(poll);
      channel?.unsubscribe();
    };
  }, [applicationId, router]);
}

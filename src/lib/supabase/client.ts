"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env, supabaseEnabled } from "@/lib/env";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (!supabaseEnabled) return null;
  client ??= createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
  return client;
}

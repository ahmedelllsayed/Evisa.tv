import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { env, serverEnv } from "@/lib/env";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: the proxy refreshes the session instead.
        }
      },
    },
  });
}

/** Service-role client for Storage and admin operations. Never expose to the browser. */
export function createSupabaseAdminClient() {
  const { serviceRoleKey } = serverEnv();
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for Supabase Storage");
  return createClient(env.supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

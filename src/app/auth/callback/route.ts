import { NextResponse, type NextRequest } from "next/server";
import { siteConfig } from "@/config/site.config";
import { getCurrentUser } from "@/lib/auth";
import { supabaseEnabled } from "@/lib/env";
import { safeNextPath } from "@/lib/safe-path";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = searchParams.get("next");
  const target = safeNextPath(next, `/${siteConfig.defaultLocale}/account`);
  const code = searchParams.get("code");
  if (supabaseEnabled && code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await getCurrentUser();
      return NextResponse.redirect(new URL(target, origin));
    }
  }
  return NextResponse.redirect(new URL(`/${siteConfig.defaultLocale}/sign-in?error=oauth`, origin));
}

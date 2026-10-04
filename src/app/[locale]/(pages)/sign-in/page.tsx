import { SignInForm } from "@/components/auth/sign-in-form";
import { supabaseEnabled } from "@/lib/env";
import type { Page } from "@/lib/page";

export const metadata = { title: "Sign in" };

export default async function SignInPage({ params, searchParams }: Page) {
  const { locale } = await params;
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : `/${locale}/account`;
  return <SignInForm next={next} googleEnabled={supabaseEnabled} />;
}

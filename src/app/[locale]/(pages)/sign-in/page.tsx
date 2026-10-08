import { localizedMetadata } from "@/lib/seo";
import type { Page } from "@/lib/page";
import { SignInForm } from "@/components/auth/sign-in-form";
import { supabaseEnabled } from "@/lib/env";


export async function generateMetadata({ params }: Page) {
  const { locale } = await params;
  return localizedMetadata(locale, "/sign-in", { en: "Sign in", ar: "تسجيل الدخول" });
}

export default async function SignInPage({ params, searchParams }: Page) {
  const { locale } = await params;
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : `/${locale}/account`;
  return <SignInForm locale={locale} next={next} googleEnabled={supabaseEnabled} />;
}

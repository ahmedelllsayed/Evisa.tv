import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isLocale, siteConfig } from "@/config/site.config";

const localePattern = /^\/[a-z]{2}-[A-Z]{2}(\/|$)/;

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!localePattern.test(pathname)) {
    const cookieLocale = request.cookies.get("locale")?.value;
    const accept = request.headers.get("accept-language") ?? "";
    const preferred = isLocale(cookieLocale ?? "")
      ? cookieLocale!
      : /\bar\b/i.test(accept)
        ? "ar-EG"
        : siteConfig.defaultLocale;
    const url = request.nextUrl.clone();
    url.pathname = `/${preferred}${pathname === "/" ? "" : pathname}`;
    url.search = search;
    return NextResponse.redirect(url);
  }

  const segment = pathname.split("/")[1] ?? "";
  const locale = isLocale(segment) ? segment : siteConfig.defaultLocale;
  const forward = () => {
    const headers = new Headers(request.headers);
    headers.set("x-locale", locale);
    headers.set("x-pathname", pathname);
    const cookie = request.cookies.getAll().map((item) => `${item.name}=${item.value}`).join("; ");
    if (cookie) headers.set("cookie", cookie);
    return NextResponse.next({ request: { headers } });
  };
  let response = forward();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (supabaseUrl && supabaseKey) {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(toSet) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = forward();
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    await supabase.auth.getUser();
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|auth|_next/static|_next/image|brand|destination-media|favicon.ico|robots.txt|sitemap.xml|.*\\.[a-zA-Z0-9]+$).*)"],
};

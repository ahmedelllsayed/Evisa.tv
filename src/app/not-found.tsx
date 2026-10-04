import Link from "next/link";
import { siteConfig } from "@/config/site.config";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-sm text-muted-ink">404</p>
      <h1 className="mt-2 font-display text-3xl font-semibold">Page not found</h1>
      <Link href={`/${siteConfig.defaultLocale}`} className="mt-6 rounded-full bg-brand px-5 py-2 text-sm text-white">
        Back home
      </Link>
    </div>
  );
}

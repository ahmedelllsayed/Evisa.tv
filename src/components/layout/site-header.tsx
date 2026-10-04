"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { SearchIcon, ShieldCheckIcon, WhatsAppIcon } from "@/components/brand/icons";
import { CitizenshipButton } from "@/components/layout/citizenship-picker";
import { UserMenu } from "@/components/layout/user-menu";
import { CountrySearchOverlay } from "@/components/search/country-search";
import { href } from "@/lib/href";
import { cn } from "@/lib/utils";
import type { SearchHit } from "@/lib/search";
import type { User } from "@/lib/types";

export function SiteHeader({
  locale,
  user,
  citizenship,
  hits,
  brandName,
  logoUrl,
  whatsapp,
}: {
  locale: string;
  user: User | null;
  citizenship: string;
  hits: SearchHit[];
  brandName: string;
  logoUrl: string;
  whatsapp: string;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [prompt, setPrompt] = useState(0);
  const path = usePathname();
  const full = /\/(visa|account|apply|payment|admin)(\/|$)/.test(path);
  const dark = /\/(passport-index|wall-of-love|tools\/visa-photo-maker)(\/|$)/.test(path);
  const prompts = ["Search", "Search countries", "Search cities"];
  useEffect(() => {
    const id = setInterval(() => setPrompt((n) => (n + 1) % prompts.length), 2800);
    return () => clearInterval(id);
  }, [prompts.length]);
  return (
    <>
      <header className={cn("sticky top-0 z-40 border-b", dark ? "border-white/10 bg-black text-white" : "border-line/80 bg-white")}>
        <div className="mx-auto flex h-16 max-w-site items-center gap-3 px-4 lg:h-[72px] lg:px-8">
          <Link href={href("/", locale)} className="flex shrink-0 items-center gap-1.5" aria-label={brandName}>
            <Logo name={brandName} src={logoUrl} className={dark ? "text-white" : undefined} />
            <span className="hidden text-[8px] leading-[1.05] font-bold tracking-[0.12em] text-brand uppercase sm:block">
              Visas on
              <br />
              time
            </span>
          </Link>
          {full && (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className={cn(
                "hidden h-10 w-[280px] shrink-0 items-center justify-between gap-2 rounded-full border px-4 text-left text-sm lg:flex",
                dark ? "border-white/15 text-white/70" : "border-line text-muted-ink",
              )}
            >
              <span>{prompts[prompt]}</span>
              <SearchIcon className="size-4" />
            </button>
          )}
          <div className="ml-auto flex items-center gap-3">
            {full && whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp"
                className="hidden text-[#25d366] lg:block"
              >
                <WhatsAppIcon className="size-6" />
              </a>
            )}
            <Link href={href("/on-time-guaranteed", locale)} className="hidden items-center gap-1.5 text-[11px] leading-tight font-semibold lg:flex">
              <ShieldCheckIcon className={dark ? "text-white" : "text-brand"} />
              <span>
                On Time
                <span className={cn("block font-medium", dark ? "text-white/60" : "text-muted-ink")}>Guaranteed</span>
              </span>
            </Link>
            {full && (
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
                className="flex size-10 items-center justify-center rounded-full border border-line lg:hidden"
              >
                <SearchIcon />
              </button>
            )}
            {full && <CitizenshipButton initial={citizenship} className="border-0" />}
            <UserMenu user={user} locale={locale} className="border-0" />
          </div>
        </div>
      </header>
      <CountrySearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        hits={hits}
        locale={locale}
        query={query}
        onQuery={setQuery}
      />
    </>
  );
}

"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { SearchIcon, ShieldCheckIcon, WhatsAppIcon } from "@/components/brand/icons";
import { CitizenshipButton } from "@/components/layout/citizenship-picker";
import { LocaleSwitch } from "@/components/layout/locale-switch";
import { UserMenu } from "@/components/layout/user-menu";
import { CountrySearchOverlay } from "@/components/search/country-search";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { href } from "@/lib/href";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { SearchHit } from "@/lib/search";
import type { User } from "@/lib/types";

const menuGroups = [
  {
    title: "footer.tools",
    links: [
      ["/tools/visa-requirements", "footer.requirements"],
      ["/tools/visa-photo-maker", "footer.photo"],
      ["/passport-index", "footer.passport"],
      ["/emergency-care", "footer.emergency"],
      ["/rejection-recovery", "footer.rejection"],
    ],
  },
  {
    title: "footer.company",
    links: [
      ["/newsroom", "footer.newsroom"],
      ["/contact", "footer.contact"],
      ["/partners", "footer.partners"],
      ["/editorial-policy", "footer.editorial"],
    ],
  },
  {
    title: "footer.trust",
    links: [
      ["/on-time-guaranteed", "footer.guarantee"],
      ["/transparency/refunds-policy", "footer.refunds"],
      ["/transparency/price-change-log", "footer.fees"],
      ["/transparency/status", "footer.status"],
    ],
  },
] as const;

export function SiteHeader({
  locale,
  user,
  citizenship,
  hits,
  brandName,
  logoUrl,
  whatsapp,
  citizenshipCodes = [],
}: {
  locale: string;
  user: User | null;
  citizenship: string;
  hits: SearchHit[];
  brandName: string;
  logoUrl: string;
  whatsapp: string;
  citizenshipCodes?: string[];
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [prompt, setPrompt] = useState(0);
  const path = usePathname();
  const full = /\/(visa|account|apply|payment|admin)(\/|$)/.test(path);
  const dark = /\/(passport-index|wall-of-love|tools\/visa-photo-maker)(\/|$)/.test(path);
  const prompts = [t(locale, "nav.search"), t(locale, "nav.search"), t(locale, "nav.search")];
  useEffect(() => {
    const id = setInterval(() => setPrompt((n) => (n + 1) % prompts.length), 2800);
    return () => clearInterval(id);
  }, [prompts.length]);
  return (
    <>
      <header className={cn("sticky top-0 z-40 border-b", dark ? "border-white/10 bg-black text-white" : "border-line/80 bg-white")}>
        <div className="mx-auto flex h-16 max-w-site min-w-0 items-center gap-2 px-4 lg:h-[72px] lg:gap-3 lg:px-8">
          <button
            type="button"
            aria-label={t(locale, "nav.menu")}
            onClick={() => setMenuOpen(true)}
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line lg:hidden"
          >
            <Menu className="size-5" />
          </button>
          <Link href={href("/", locale)} className="flex min-w-0 shrink items-center gap-1.5" aria-label={brandName}>
            <Logo name={brandName} src={logoUrl} className={dark ? "text-white" : undefined} />
            <span className="hidden text-[8px] leading-[1.05] font-bold tracking-[0.12em] text-brand uppercase sm:block">
              {t(locale, "nav.visasOn")}
              <br />
              {t(locale, "nav.time")}
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
          <div className="ms-auto flex shrink-0 items-center gap-2 sm:gap-3">
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
                {t(locale, "nav.onTime")}
                <span className={cn("block font-medium", dark ? "text-white/60" : "text-muted-ink")}>{t(locale, "nav.guaranteed")}</span>
              </span>
            </Link>
            {full && (
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label={t(locale, "nav.search")}
                className="hidden size-10 items-center justify-center rounded-full border border-line sm:flex lg:hidden"
              >
                <SearchIcon />
              </button>
            )}
            {full && <CitizenshipButton initial={citizenship} codes={citizenshipCodes} className="hidden border-0 sm:flex" />}
            <LocaleSwitch locale={locale} />
            <UserMenu user={user} locale={locale} className="border-0" />
          </div>
        </div>
      </header>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[min(100vw,22rem)] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t(locale, "nav.menu")}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-4 pb-8">
            <div className="flex items-center gap-2">
              {full && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setSearchOpen(true);
                  }}
                  className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full border border-line text-sm"
                >
                  <SearchIcon className="size-4" /> {t(locale, "nav.search")}
                </button>
              )}
              <CitizenshipButton initial={citizenship} codes={citizenshipCodes} />
              <LocaleSwitch locale={locale} />
            </div>
            <Link href={href("/", locale)} onClick={() => setMenuOpen(false)} className="text-sm font-medium">
              {t(locale, "nav.home")}
            </Link>
            <Link href={href("/on-time-guaranteed", locale)} onClick={() => setMenuOpen(false)} className="text-sm font-medium">
              {t(locale, "nav.onTime")} {t(locale, "nav.guaranteed")}
            </Link>
            <Link href={href("/account", locale)} onClick={() => setMenuOpen(false)} className="text-sm font-medium">
              {t(locale, "nav.profile")}
            </Link>
            {menuGroups.map((group) => (
              <div key={group.title}>
                <p className="mb-2 text-xs font-semibold tracking-wide text-muted-ink uppercase">{t(locale, group.title)}</p>
                <ul className="space-y-2">
                  {group.links.map(([path, label]) => (
                    <li key={path}>
                      <Link href={href(path, locale)} onClick={() => setMenuOpen(false)} className="text-sm">
                        {t(locale, label)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
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

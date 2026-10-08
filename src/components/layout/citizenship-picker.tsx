"use client";

import { Pencil } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLocale } from "@/components/providers";
import { siteConfig } from "@/config/site.config";
import { citizenshipChoices, countryName, flagUrl } from "@/lib/countries";
import { track } from "@/lib/analytics";
import { t, tf } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { rememberLocale, useLocaleHref } from "@/components/layout/locale-switch";

function setCitizenshipCookie(code: string) {
  document.cookie = `citizenship=${code}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  track("citizenship_change", { citizenship: code });
}

export function Flag({ code, size = 20, className }: { code: string; size?: number; className?: string }) {
  return (
    <Image
      src={flagUrl(code, 40)}
      alt={`flag of ${code}`}
      width={size}
      height={size}
      unoptimized
      className={cn("aspect-square rounded-full object-cover", className)}
      style={{ width: size, height: size }}
    />
  );
}

function LangToggle({ locale }: { locale: string }) {
  const enHref = useLocaleHref("en-EG");
  const arHref = useLocaleHref("ar-EG");
  const active = locale.toLowerCase().startsWith("ar") ? "ar" : "en";
  const choice = (id: "en" | "ar", label: string, target: "en-EG" | "ar-EG", href: string) => (
    <Link
      href={href}
      onClick={() => rememberLocale(target)}
      hrefLang={id === "ar" ? "ar" : "en"}
      aria-current={active === id ? "page" : undefined}
      className={cn("rounded-full px-3 py-1", active === id ? "bg-white text-black shadow-sm" : "text-muted-ink")}
    >
      {label}
    </Link>
  );
  return (
    <div className="mb-2 inline-flex rounded-full border border-line bg-[#f6f7f8] p-0.5 text-xs font-medium" role="group" aria-label="Language">
      {choice("en", "English", "en-EG", enHref)}
      {choice("ar", "العربية", "ar-EG", arHref)}
    </div>
  );
}

function CountryList({
  value,
  onSelect,
  locale,
  codes,
}: {
  value: string;
  onSelect: (code: string) => void;
  locale: string;
  codes?: string[];
}) {
  const [query, setQuery] = useState("");
  const pool = useMemo(() => citizenshipChoices(codes, value), [codes, value]);
  const list = useMemo(
    () =>
      pool.filter((c) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return c.name.toLowerCase().includes(q) || countryName(c.code, "ar").toLowerCase().includes(q);
      }),
    [pool, query],
  );
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{t(locale, "citizen.title")}</p>
      <label className="flex items-center gap-2 rounded-full border border-line px-3 py-2">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(locale, "citizen.search")}
          className="w-full bg-transparent text-sm outline-none"
        />
      </label>
      <p className="mt-3 mb-2 flex items-center justify-between text-xs text-muted-ink">
        <span>{t(locale, "citizen.all")}</span>
        <span>[{pool.length}]</span>
      </p>
      <LangToggle locale={locale} />
      <div className="flex max-h-52 flex-wrap gap-2 overflow-y-auto">
        {list.map((c) => (
          <button
            key={c.code}
            type="button"
            onClick={() => onSelect(c.code)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border bg-white px-2.5 py-1 text-sm",
              c.code === value ? "border-brand" : "border-line",
            )}
          >
            <Flag code={c.code} size={16} />
            {countryName(c.code, locale)}
          </button>
        ))}
      </div>
    </div>
  );
}

function useCitizenship(initial: string) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [, startTransition] = useTransition();
  const select = (code: string) => {
    setValue(code);
    setCitizenshipCookie(code);
    startTransition(() => router.refresh());
  };
  return { value, select };
}

/** Round flag button in the header that opens the citizenship list. */
export function CitizenshipButton({ initial, className, codes }: { initial: string; className?: string; codes?: string[] }) {
  const locale = useLocale();
  const { value, select } = useCitizenship(initial);
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={t(locale, "citizen.change")}
        className={cn(
          "flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line bg-white",
          className,
        )}
      >
        <Flag code={value} size={20} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(28rem,calc(100vw-2rem))] rounded-2xl p-4">
        <p className="text-base font-semibold">{t(locale, "citizen.yours")}</p>
        <p className="text-xs text-slate-ink">{t(locale, "citizen.note")}</p>
        <CountryList
          value={value}
          locale={locale}
          codes={codes}
          onSelect={(code) => {
            select(code);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/** First-visit modal on visa pages ("Your citizenship"). */
export function CitizenshipDialog({ initial, defaultOpen, codes }: { initial: string; defaultOpen: boolean; codes?: string[] }) {
  const locale = useLocale();
  const { value, select } = useCitizenship(initial);
  const [open, setOpen] = useState(defaultOpen);
  const close = (next: boolean) => {
    setOpen(next);
    if (!next) setCitizenshipCookie(value);
  };
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[min(85dvh,40rem)] w-[min(36rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl p-5">
        <DialogTitle className="text-lg font-semibold">{t(locale, "citizen.yours")}</DialogTitle>
        <DialogDescription className="text-slate-ink">{t(locale, "citizen.note")}</DialogDescription>
        <p className="mt-2 text-sm">{tf(locale, "citizen.live", { country: siteConfig.market.countryName })}</p>
        <span className="flex w-fit items-center gap-2 rounded-lg bg-[#E5F9E7] px-2.5 py-1.5 text-sm">
          <Flag code={value} size={16} />
          {countryName(value, locale)}
          <Pencil className="ms-3 size-3.5 text-brand" />
        </span>
        <CountryList value={value} locale={locale} codes={codes} onSelect={select} />
      </DialogContent>
    </Dialog>
  );
}

import { isArabicLocale } from "@/lib/i18n";
import type { SiteExtras } from "@/lib/data/settings";

export function OfferCard({ locale, extras, variant = "page" }: { locale: string; extras: SiteExtras; variant?: "page" | "sidebar" }) {
  if (!extras.offerUrl) return null;
  const arabic = isArabicLocale(locale);
  const title = (arabic ? extras.offerTitleAr : extras.offerTitleEn) || extras.offerTitleEn || extras.offerTitleAr;
  const note = (arabic ? extras.offerNoteAr : extras.offerNoteEn) || extras.offerNoteEn || extras.offerNoteAr;
  if (!title) return null;
  if (variant === "sidebar") {
    return (
      <aside className="relative min-w-0 overflow-hidden rounded-[22px] border border-brand-100 bg-brand-50/60 p-5">
        <span aria-hidden className="absolute -end-8 -top-8 size-24 rounded-full bg-[#ffd873]/50" />
        <p className="relative text-xs font-semibold text-brand-700">{arabic ? "عرض إضافي" : "Optional extra"}</p>
        <h2 className="relative mt-1 text-base font-semibold text-[#16182b]">{title}</h2>
        {note ? <p className="relative mt-1.5 text-sm leading-relaxed text-body">{note}</p> : null}
        <a
          href={`/api/offer?locale=${locale}`}
          className="relative mt-4 inline-flex h-10 w-full items-center justify-center rounded-full bg-[#16182b] px-4 text-sm font-semibold text-white transition-colors hover:bg-black"
        >
          {arabic ? "عرض التفاصيل" : "See details"}
        </a>
      </aside>
    );
  }
  return (
    <aside className="mx-auto mt-4 w-full max-w-md rounded-[26px] border border-[#e3e5f2] bg-white px-6 py-5">
      <p className="text-xs font-semibold text-brand">{arabic ? "عرض إضافي" : "Optional extra"}</p>
      <h2 className="mt-1 text-lg font-semibold text-[#16182b]">{title}</h2>
      {note ? <p className="mt-2 text-sm leading-relaxed text-body">{note}</p> : null}
      <a href={`/api/offer?locale=${locale}`} className="mt-4 inline-flex h-11 items-center rounded-full bg-[#16182b] px-5 text-sm font-semibold text-white">
        {arabic ? "عرض التفاصيل" : "See details"}
      </a>
    </aside>
  );
}

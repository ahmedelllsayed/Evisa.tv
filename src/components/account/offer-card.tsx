import { isArabicLocale } from "@/lib/i18n";
import type { SiteExtras } from "@/lib/data/settings";

export function OfferCard({ locale, extras }: { locale: string; extras: SiteExtras }) {
  if (!extras.offerUrl) return null;
  const arabic = isArabicLocale(locale);
  const title = (arabic ? extras.offerTitleAr : extras.offerTitleEn) || extras.offerTitleEn || extras.offerTitleAr;
  const note = (arabic ? extras.offerNoteAr : extras.offerNoteEn) || extras.offerNoteEn || extras.offerNoteAr;
  if (!title) return null;
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

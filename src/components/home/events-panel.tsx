"use client";

import { MediaImage } from "@/components/media-image";
import Link from "next/link";
import { tf, t } from "@/lib/i18n";
import { localizedDestinationName } from "@/lib/localize";
import type { Destination, TravelEvent } from "@/lib/types";
import { visaHref } from "@/lib/href";
import { formatDate } from "@/lib/visa";

export function EventsPanel({
  events,
  destinations,
  locale,
}: {
  events: TravelEvent[];
  destinations: Destination[];
  locale: string;
}) {
  const byCode = new Map(destinations.map((d) => [d.code, d]));
  return (
    <div className="mx-auto grid max-w-site gap-5 px-4 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((e) => {
        const dest = byCode.get(e.countryCode);
        return (
          <article key={e.id} className="overflow-hidden rounded-card-sm border border-line lg:rounded-card">
            <div className="relative aspect-16/10 bg-surface">
              {(e.image || dest?.image) && (
                <MediaImage src={e.image || dest!.image!} alt={e.name} fill className="object-cover" sizes="400px" />
              )}
            </div>
            <div className="p-4">
              <p className="text-xs tracking-wide text-muted-ink uppercase">{e.city}</p>
              <h3 className="mt-1 font-display text-lg font-semibold">{e.name}</h3>
              <p className="mt-1 text-sm text-slate-ink">{formatDate(e.startsOn, locale)}</p>
              {dest?.visaRequired ? (
                <Link href={visaHref(dest.slug, locale)} className="mt-3 inline-block text-sm font-medium text-brand">
                  {tf(locale, "event.get", { name: localizedDestinationName(dest, locale) })}
                </Link>
              ) : dest ? (
                <p className="mt-3 text-sm text-success">{t(locale, "card.noVisa")}</p>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

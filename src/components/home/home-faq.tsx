"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useLocale } from "@/components/providers";
import { t } from "@/lib/i18n";
import { localizeFaq, localizeReview } from "@/lib/localize";
import type { Faq, Review } from "@/lib/types";
import { initials } from "@/lib/visa";
import { StarRow } from "@/components/brand/icons";

export function HomeFaq({ faqs }: { faqs: Faq[] }) {
  const locale = useLocale();
  const rows = faqs.map((f) => localizeFaq(f, locale));
  return (
    <section className="mx-auto mt-20 max-w-3xl px-4">
      <h2 className="text-center font-display text-3xl font-semibold">{t(locale, "visa.faq")}</h2>
      <Accordion className="mt-6">
        {rows.map((f) => (
          <AccordionItem key={f.id} value={f.id}>
            <AccordionTrigger className="text-start text-base">{f.question}</AccordionTrigger>
            <AccordionContent className="text-body">{f.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

export function HomeReviews({ reviews }: { reviews: Review[] }) {
  const locale = useLocale();
  const rows = reviews.map((r) => localizeReview(r, locale));
  return (
    <section className="mx-auto mt-20 w-full min-w-0 max-w-site px-4">
      <h2 className="text-center font-display text-3xl font-semibold">{t(locale, "home.loved")}</h2>
      {rows.length > 0 && (
        <p className="mt-2 text-center text-sm text-muted-ink">{rows.length}</p>
      )}
      <div className="mt-8 flex w-full min-w-0 gap-4 overflow-x-auto pb-4 scrollbar-none">
        {rows.map((r) => (
          <figure key={r.id} className="w-72 shrink-0 rounded-2xl border border-line p-5">
            <StarRow rating={r.rating} />
            <blockquote className="mt-3 text-sm leading-relaxed text-body">{r.body}</blockquote>
            <figcaption className="mt-4 flex items-center gap-2 text-sm">
              <span className="flex size-8 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand">
                {initials(r.author)}
              </span>
              <span>
                <span className="block font-medium">{r.author}</span>
                <span className="text-xs text-muted-ink">
                  {r.product}
                  {r.location ? ` · ${r.location}` : ""}
                </span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

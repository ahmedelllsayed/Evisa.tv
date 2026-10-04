"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { Faq, Review } from "@/lib/types";
import { initials } from "@/lib/visa";
import { siteConfig } from "@/config/site.config";
import { StarRow } from "@/components/brand/icons";

export function HomeFaq({ faqs }: { faqs: Faq[] }) {
  return (
    <section className="mx-auto mt-20 max-w-3xl px-4">
      <h2 className="text-center font-display text-3xl font-semibold">Frequently asked questions</h2>
      <Accordion className="mt-6">
        {faqs.map((f) => (
          <AccordionItem key={f.id} value={f.id}>
            <AccordionTrigger className="text-left text-base">{f.question}</AccordionTrigger>
            <AccordionContent className="text-body">{f.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

export function HomeReviews({ reviews }: { reviews: Review[] }) {
  return (
    <section className="mx-auto mt-20 max-w-site px-4">
      <h2 className="text-center font-display text-3xl font-semibold">Loved by travellers</h2>
      <p className="mt-2 text-center text-sm text-muted-ink">
        {siteConfig.stats.rating} average · {siteConfig.stats.reviewCount} reviews
      </p>
      <div className="mt-8 flex gap-4 overflow-x-auto pb-4 scrollbar-none">
        {reviews.map((r) => (
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

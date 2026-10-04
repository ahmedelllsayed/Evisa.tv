"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { searchHelpAction } from "@/app/actions/help";
import { visaHref } from "@/lib/href";

export function AskCatalog({ locale, name }: { locale: string; name: string }) {
  const [query, setQuery] = useState("");
  const [faqs, setFaqs] = useState<{ question: string; answer: string }[]>([]);
  const [destinations, setDestinations] = useState<{ name: string; slug: string }[]>([]);
  const [searched, setSearched] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className="mt-6">
      <p className="text-sm font-medium">Ask about {name}</p>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          start(async () => {
            const result = await searchHelpAction(query);
            setFaqs(result.faqs);
            setDestinations(result.destinations);
            setSearched(true);
          });
        }}
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search visas and questions"
          className="h-9 min-w-0 flex-1 rounded-xl border border-line px-3 text-sm"
        />
        <button disabled={pending} className="rounded-xl bg-brand px-3 text-sm text-white disabled:opacity-60">
          Ask
        </button>
      </form>
      {searched && faqs.length === 0 && destinations.length === 0 && (
        <p className="mt-2 text-xs text-muted-ink">No matching questions or destinations.</p>
      )}
      <ul className="mt-2 space-y-2 text-sm">
        {destinations.map((destination) => (
          <li key={destination.slug}>
            <Link href={visaHref(destination.slug, locale)} className="font-medium text-brand">
              {destination.name}
            </Link>
          </li>
        ))}
        {faqs.map((faq) => (
          <li key={faq.question}>
            <p className="font-medium">{faq.question}</p>
            <p className="text-xs text-body">{faq.answer}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

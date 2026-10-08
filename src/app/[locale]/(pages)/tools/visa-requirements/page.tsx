import { localizedMetadata } from "@/lib/seo";
import type { Page } from "@/lib/page";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { RequirementsChecker } from "@/components/tools/requirements-checker";
import { listDestinations } from "@/lib/data/catalog";
import { requirePageContent } from "@/lib/data/pages";
import { getCitizenship } from "@/lib/preferences";
import type { Destination } from "@/lib/types";
import { visaTypeLabels } from "@/lib/visa";


const kinds = [
  ["Visa-free", "Show your passport and walk in.", "No application", "Instant at the border", "Free"],
  ["Visa on arrival", "Collect the visa at the airport or land border.", "No advance form", "Same day", "A small border fee"],
  ["e-Visa", "Apply online before you fly.", "1–7 days ahead", "A few days", "Government fee plus service"],
  ["Embassy visa", "Full application, often with an appointment.", "Weeks ahead", "2–8 weeks", "Higher consular fee"],
];

const speedBands: { title: string; time: string; body: string; match: (destination: Destination) => boolean }[] = [
  { title: "Instant", time: "Same day", body: "Visa-free entry or a stamp at the airport.", match: (d) => !d.visaRequired || (d.processingHours ?? 999) < 24 },
  { title: "Fast", time: "1–3 days", body: "Short applications filed a few days before departure.", match: (d) => d.visaRequired && (d.processingHours ?? 0) >= 24 && (d.processingHours ?? 0) <= 72 },
  { title: "Standard", time: "3–10 days", body: "Online visas with a short review.", match: (d) => d.visaRequired && (d.processingHours ?? 0) > 72 && (d.processingHours ?? 0) <= 240 },
  { title: "Plan ahead", time: "Over 10 days", body: "Applications that need more lead time.", match: (d) => d.visaRequired && (d.processingHours ?? 0) > 240 },
];

const mistakes = [
  ["Validity", "Passport expires within six months", "Most destinations want six months of validity left on the day you enter."],
  ["Transit", "Forgetting the transit visa", "A layover in the UK, US, China or Schengen can still need its own permission."],
  ["Residence", "Mixing residence and nationality", "Some rules follow where you live, not only the passport you hold."],
  ["Photos", "Wrong photo specs", "Background, glasses and head size are the usual reasons a photo is sent back."],
  ["Funds", "Thin bank statements", "Embassies often ask for several months of steady balances."],
  ["Stay limits", "Overstaying a visa-free entry", "Visa-free is a counted stay, often 30, 60 or 90 days."],
];

const faqs = [
  ["Do I need a visa to travel?", "It depends on the passport and the destination. Use the checker for visa-free, visa on arrival, e-visa, or embassy."],
  ["What is the difference between visa-free and visa on arrival?", "Visa-free means no visa at all. Visa on arrival means you are issued one when you land."],
  ["What is an e-visa?", "A visa you apply for online. It is stored against your passport number rather than stuck in the booklet."],
  ["Do requirements change?", "Yes. Check again close to the travel date, even if you looked the route up before."],
  ["Is this checker free?", "Yes. No account and no card."],
];

export async function generateMetadata({ params }: Page) {
  const { locale } = await params;
  return localizedMetadata(locale, "/tools/visa-requirements", { en: "Visa Requirements Checker", ar: "فحص متطلبات التأشيرة" });
}

export default async function VisaRequirementsPage({ params }: Page) {
  const { locale } = await params;
  const [destinations, content, passport] = await Promise.all([
    listDestinations(),
    requirePageContent("tools/visa-requirements"),
    getCitizenship(),
  ]);
  return (
    <div className="bg-[#f6f7fb]">
      <section className="mx-auto max-w-4xl px-4 pt-16 pb-8 text-center">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-brand uppercase">{content.kicker}</p>
        <h1 className="font-serif mt-3 text-5xl font-medium md:text-6xl">{content.title}</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-body">{content.intro}</p>
        <dl className="mx-auto mt-8 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            [String(destinations.length), "Countries covered"],
            ["Daily", "Refreshed from official sources"],
            ["Free", "No signup, no card"],
            ["5 sec", "Answer time"],
          ].map(([n, l]) => (
            <div key={l}>
              <dt className="font-display text-2xl font-semibold">{n}</dt>
              <dd className="text-[11px] tracking-wide text-muted-ink uppercase">{l}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-xs text-muted-ink">1 Pick passport · 2 Pick destination · 3 See the requirement</p>
        <RequirementsChecker destinations={destinations} locale={locale} passport={passport} />
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14">
        <p className="text-xs font-semibold tracking-[0.16em] text-muted-ink">01 — ENTRY RULES</p>
        <h2 className="font-serif mt-2 text-3xl leading-tight md:text-[40px]">The four kinds of visa rules</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {kinds.map(([title, body, apply, time, fee]) => (
            <article key={title} className="rounded-3xl bg-white p-5">
              <h3 className="font-display text-xl font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-body">{body}</p>
              <dl className="mt-4 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                <div><dt className="text-muted-ink">Apply</dt><dd className="font-medium">{apply}</dd></div>
                <div><dt className="text-muted-ink">Processing</dt><dd className="font-medium">{time}</dd></div>
                <div><dt className="text-muted-ink">Typical fee</dt><dd className="font-medium">{fee}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-14">
        <p className="text-xs font-semibold tracking-[0.16em] text-muted-ink">02 — TRENDING</p>
        <h2 className="font-serif mt-2 text-3xl leading-tight md:text-[40px]">Popular this week</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.slice(0, 12).map((destination) => (
            <div key={destination.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white px-4 py-3">
              <span className="min-w-0 font-medium">{destination.name}</span>
              <span className="text-xs tracking-wide text-muted-ink uppercase">{visaTypeLabels[destination.visaType]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-14">
        <p className="text-xs font-semibold tracking-[0.16em] text-muted-ink">03 — HOW LONG IT TAKES</p>
        <h2 className="font-serif mt-2 text-3xl leading-tight md:text-[40px]">Processing times at a glance</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {speedBands.map((band) => (
            <article key={band.title} className="rounded-3xl bg-white p-5">
              <p className="text-xs font-semibold tracking-widest text-brand uppercase">{band.title}</p>
              <p className="mt-2 font-display text-xl font-semibold">{band.time}</p>
              <p className="mt-2 text-sm text-body">{band.body}</p>
              <p className="mt-3 text-xs text-muted-ink">
                {destinations.filter(band.match).slice(0, 4).map((destination) => destination.name).join(", ") || "—"}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-14">
        <p className="text-xs font-semibold tracking-[0.16em] text-muted-ink">04 — POLICY CHANGES</p>
        <h2 className="font-serif mt-2 text-3xl leading-tight md:text-[40px]">Recent policy updates</h2>
        <ul className="mt-6 space-y-4">
          {destinations.slice(0, 6).map((destination) => {
            const source = destination.sources.find((item) => /^https?:\/\//.test(item.url));
            return (
              <li key={destination.id} className="rounded-2xl bg-white p-4">
                <p className="text-xs text-muted-ink">{visaTypeLabels[destination.visaType]} · {destination.name}</p>
                {source ? (
                  <a href={source.url} target="_blank" rel="noreferrer" className="mt-1 block text-sm text-brand">
                    {source.label}
                  </a>
                ) : (
                  <p className="mt-1 text-sm">No official source is stored for this destination yet.</p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="bg-[#111] px-4 py-14 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-semibold tracking-[0.16em] text-white/50">05 — AVOID THESE</p>
          <h2 className="font-serif mt-2 text-3xl leading-tight md:text-[40px]">Common mistakes that delay travel</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {mistakes.map(([k, title, body]) => (
              <article key={k} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-[11px] tracking-[0.16em] text-white/40">{k}</p>
                <h3 className="mt-2 font-medium">{title}</h3>
                <p className="mt-2 text-sm text-white/65">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14">
        <p className="text-xs font-semibold tracking-[0.16em] text-muted-ink">06 — ANSWERS</p>
        <h2 className="font-serif mt-2 text-3xl leading-tight md:text-[40px]">Frequently asked questions</h2>
        <Accordion className="mt-4">
          {faqs.map(([q, a]) => (
            <AccordionItem key={q} value={q}>
              <AccordionTrigger>{q}</AccordionTrigger>
              <AccordionContent>{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}

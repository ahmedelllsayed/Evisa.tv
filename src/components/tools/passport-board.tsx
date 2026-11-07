"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { passportRanks, passportRegions, type PassportRank } from "@/data/passport-ranks";
import { href } from "@/lib/href";
import { isArabicLocale, t, tf, type MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const faqsEn = [
  ["What does visa-free actually mean?", "You enter by showing a valid passport. There is no application and no visa fee, though border officers can still ask for a return ticket, funds, or a hotel booking."],
  ["How is visa on arrival different?", "You still receive a visa, but you collect it at the airport or land border, usually after a short form and a fee."],
  ["What is an e-visa?", "An online visa you apply for before you fly. It is tied to your passport number, so there is no sticker in the booklet."],
  ["Why do some passports rank higher?", "The score adds visa-free, visa-on-arrival, ETA and e-visa access. Agreements, not GDP alone, move a passport up or down."],
  ["Can a ranking change?", "Yes. A new bilateral deal or a suspended exemption can shift a passport several places in a single season."],
];

const regionKeys: Record<string, MessageKey> = {
  All: "tool.all",
  Europe: "tool.rEurope",
  Asia: "tool.rAsia",
  Americas: "tool.rAmericas",
  Africa: "tool.rAfrica",
  Oceania: "tool.rOceania",
  "Middle East": "tool.rMiddleEast",
};

function regionLabel(locale: string, region: string) {
  const key = regionKeys[region];
  return key ? t(locale, key) : region;
}

const faqsAr = [
  ["ماذا يعني بدون تأشيرة؟", "تدخل بإبراز جواز ساري. لا يوجد طلب ولا رسم تأشيرة، وقد يطلب موظف الحدود تذكرة عودة أو إثبات أموال أو حجز فندق."],
  ["كيف تختلف التأشيرة عند الوصول؟", "تحصل على تأشيرة، لكنك تستلمها في المطار أو المعبر البري بعد نموذج قصير ورسم."],
  ["ما التأشيرة الإلكترونية؟", "تأشيرة تطلبها عبر الإنترنت قبل السفر. ترتبط برقم الجواز، ولا يُلصق شيء في الجواز."],
  ["لماذا تتصدر بعض الجوازات؟", "النقاط تجمع الدخول بدون تأشيرة وعند الوصول وتصريح السفر والتأشيرة الإلكترونية. الاتفاقيات، لا الناتج وحده، تحرّك الترتيب."],
  ["هل يتغير الترتيب؟", "نعم. اتفاق ثنائي جديد أو تعليق إعفاء قد ينقل الجواز عدة مراتب في موسم واحد."],
];

export function PassportBoard({
  locale,
  names,
  kicker = "2026 passport power index · updated September 2026",
  title = "The world's most powerful passports",
  intro = "Compare passports by visa-free access, mobility score and global rank. Find one, study the rest, and plan the next trip.",
}: {
  locale: string;
  names: Record<string, string>;
  kicker?: string;
  title?: string;
  intro?: string;
}) {
  const faqs = isArabicLocale(locale) ? faqsAr : faqsEn;
  const label = (name: string) => names[name] ?? name;
  const [region, setRegion] = useState<(typeof passportRegions)[number]>("All");
  const [sort, setSort] = useState<"rank" | "visa" | "name">("rank");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<PassportRank>(passportRanks[0]);
  const [compare, setCompare] = useState<PassportRank | null>(null);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const named = (name: string) => names[name] ?? name;
    const list = passportRanks.filter((item) => (region === "All" || item.region === region) && (!needle || `${item.name} ${named(item.name)}`.toLowerCase().includes(needle)));
    return [...list].sort((a, b) => {
      if (sort === "name") return named(a.name) < named(b.name) ? -1 : named(a.name) > named(b.name) ? 1 : 0;
      if (sort === "visa") return b.visaFree - a.visaFree || a.rank - b.rank;
      return a.rank - b.rank || b.visaFree - a.visaFree;
    });
  }, [names, query, region, sort]);

  const top = passportRanks.slice(0, 3);

  return (
    <div className="bg-[#f6f7fb] text-[#16182b]">
      <section className="mx-auto max-w-5xl px-4 pt-16 pb-10 text-center">
        <p className="text-[11px] font-semibold tracking-[0.22em] text-brand uppercase">{kicker}</p>
        <h1 className="mx-auto mt-4 max-w-[768px] font-sans text-4xl leading-tight font-semibold md:text-6xl lg:text-[72px]">{title}</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-body">{intro}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <a href="#ranking" className="rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white">{t(locale, "tool.rank")}</a>
          <a href="#ranking" className="rounded-full border border-[#e3e5f2] bg-white px-5 py-2.5 text-sm">{t(locale, "tool.visaFree")}</a>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {top.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => setActive(p)}
              className={cn("rounded-2xl border p-4 text-start", active.name === p.name ? "border-brand bg-brand-50" : "border-[#e3e5f2] bg-white")}
            >
              <p className="text-[11px] tracking-[0.16em] text-muted-ink">{t(locale, "tool.rank")} #{p.rank}</p>
              <p className="mt-2 font-medium">{label(p.name)}</p>
              <p className="mt-1 text-xs text-muted-ink">{t(locale, "tool.score")} {p.score} · {p.visaFree} {t(locale, "tool.visaFree")}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-12 text-center">
        <div className="mx-auto h-36 w-24 rounded-lg bg-linear-to-b from-amber-200 to-amber-700 shadow-[0_20px_50px_rgba(22,24,43,0.12)]" />
        <p className="mt-6 text-xl font-medium">{label(active.name)}</p>
        <dl className="mt-6 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
          <div><dt className="text-[11px] tracking-widest text-muted-ink">{t(locale, "tool.rank")}</dt><dd className="mt-1 text-2xl font-semibold">#{active.rank}</dd></div>
          <div><dt className="text-[11px] tracking-widest text-muted-ink">{t(locale, "tool.score")}</dt><dd className="mt-1 text-2xl font-semibold">{active.score}</dd></div>
          <div><dt className="text-[11px] tracking-widest text-muted-ink">{t(locale, "tool.visaFree")}</dt><dd className="mt-1 text-2xl font-semibold">{active.visaFree}</dd></div>
        </dl>
        {compare && compare.name !== active.name ? (
          <p className="mt-4 text-sm text-body">
            {label(active.name)} #{active.rank} · {active.visaFree} {t(locale, "tool.visaFree")}
            {" · "}
            {label(compare.name)} #{compare.rank} · {compare.visaFree} {t(locale, "tool.visaFree")}
          </p>
        ) : (
          <p className="mt-4 text-xs text-muted-ink">{isArabicLocale(locale) ? "اضغط جوازًا آخر للمقارنة." : "Pick another passport to compare."}</p>
        )}
      </section>

      <section className="mx-auto grid max-w-5xl gap-px border-y border-[#e3e5f2] bg-white px-4 py-8 sm:grid-cols-3">
        <Stat k={t(locale, "tool.tracked")} v={String(passportRanks.length)} />
        <Stat k={t(locale, "tool.mostFree")} v={tf(locale, "tool.countries", { n: passportRanks[0].visaFree })} d={tf(locale, "tool.heldBy", { name: label(passportRanks[0].name) })} />
        <Stat k={t(locale, "tool.top10")} v={t(locale, "tool.topMix")} d={t(locale, "tool.topNote")} />
      </section>

      <section id="ranking" className="mx-auto max-w-5xl px-4 py-14">
        <h2 className="font-serif text-3xl">{t(locale, "tool.complete")}</h2>
        <p className="mt-2 max-w-xl text-sm text-muted-ink">{t(locale, "tool.rankedBy")}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {passportRegions.map((r) => (
            <button key={r} type="button" onClick={() => setRegion(r)} className={cn("rounded-full px-3 py-1 text-xs", region === r ? "bg-[#16182b] text-white" : "border border-[#e3e5f2] bg-white text-[#4b5068]")}>
              {regionLabel(locale, r)}
            </button>
          ))}
          {(["rank", "visa", "name"] as const).map((s) => (
            <button key={s} type="button" onClick={() => setSort(s)} className={cn("rounded-full border px-3 py-1 text-xs", sort === s ? "border-[#16182b] bg-white" : "border-[#e3e5f2] bg-white text-muted-ink")}>
              {s === "rank" ? t(locale, "tool.rank") : s === "visa" ? t(locale, "tool.visaFree") : t(locale, "tool.name")}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t(locale, "citizen.search")}
          className="mt-4 h-11 w-full rounded-full border border-[#e3e5f2] bg-white px-4 text-sm text-[#16182b]"
        />
        <p className="mt-4 text-xs text-muted-ink">{tf(locale, "tool.showing", { shown: rows.length, total: passportRanks.length })}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => {
                if (p.name !== active.name) setCompare(active);
                setActive(p);
              }}
              className="rounded-2xl border border-[#e3e5f2] bg-white p-4 text-start hover:border-brand-200"
            >
              <p className="text-[11px] tracking-[0.14em] text-brand">#{p.rank} · {t(locale, "tool.elite")}</p>
              <p className="mt-1 font-medium">{label(p.name)}</p>
              <p className="text-xs text-muted-ink">{tf(locale, "tool.regionScore", { region: regionLabel(locale, p.region), score: p.score })}</p>
              <p className="mt-3 text-[11px] tracking-widest text-muted-ink">{t(locale, "tool.visaFree")}</p>
              <p className="text-lg font-semibold">{p.visaFree}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-16">
        <h2 className="font-serif text-3xl">{t(locale, "visa.faq")}</h2>
        <Accordion className="mt-4 rounded-3xl border border-[#e3e5f2] bg-white px-5">
          {faqs.map(([q, a]) => (
            <AccordionItem key={q} value={q} className="border-[#e3e5f2]">
              <AccordionTrigger>{q}</AccordionTrigger>
              <AccordionContent className="text-body">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="px-4 pb-16">
        <div className="mx-auto max-w-3xl rounded-[22px] border border-[#e3e5f2] bg-white px-6 py-10 text-center">
          <h2 className="font-serif text-3xl">{t(locale, "tool.needVisa")}</h2>
          <Link href={href("/tools/visa-requirements", locale)} className="mt-6 inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white">
            {t(locale, "home.explore")}
          </Link>
        </div>
      </section>
    </div>
  );
}

function Stat({ k, v, d }: { k: string; v: string; d?: string }) {
  return (
    <div className="px-4 py-2">
      <p className="text-[11px] tracking-[0.16em] text-muted-ink uppercase">{k}</p>
      <p className="mt-2 text-2xl font-semibold">{v}</p>
      {d && <p className="text-sm text-body">{d}</p>}
    </div>
  );
}

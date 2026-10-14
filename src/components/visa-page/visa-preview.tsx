"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { CalendarDays, ChevronRight, FileText, ShieldCheck, Timer } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { href } from "@/lib/href";
import { isArabicLocale, t, tf } from "@/lib/i18n";
import { localizedDestinationName, localizedPhrase } from "@/lib/localize";
import type { Destination, Faq, Review, VisaOption } from "@/lib/types";
import {
  fallbackVisaOption,
  formatAt,
  guaranteedDate,
  optionHours,
  optionTotal,
  processingLabel,
  visaTypeLabel,
} from "@/lib/visa";
import { ApplyDialog } from "./apply-dialog";
import { FaqSection, HowItWorks, NearbyStrip, Rejections, Reveal, ReviewsCarousel, SectionTabs, SectionTitle, SourcesPanel, TrustBand, stepIcons } from "./content";
import { c } from "./copy";
import { shortDate } from "./dates";
import { cn } from "@/lib/utils";
import { AnimatedMoney, FlipText, easeOut } from "./motion";
import { VisaPass } from "./pass";
import { DocumentsList, SpeedPicker, StepHeading, TypePicker } from "./pickers";

const previewStyles = [
  "@media (max-width: 1023px){[data-app-nav]{display:none}}",
  ".vp-ar{text-align:left}",
  ".vp-ar :where(p,h2,h3,li,dt,dd,span,a,button,label,blockquote,figcaption,input):not(h1 *){unicode-bidi:plaintext}",
].join("");

export function VisaPreview({
  locale,
  destination,
  options,
  initialOptionId,
  faqs,
  reviews,
  nearby,
  existingId,
  existingOptionId,
  existingExpress,
  applyOpen,
  nowIso,
  approvalRate,
  brandName,
  whatsapp,
}: {
  locale: string;
  destination: Destination;
  options: VisaOption[];
  initialOptionId?: string | null;
  faqs: Faq[];
  reviews: Review[];
  nearby: Destination[];
  existingId?: string | null;
  existingOptionId?: string | null;
  existingExpress?: boolean;
  applyOpen?: boolean;
  nowIso: string;
  approvalRate: number | null;
  brandName: string;
  whatsapp: string;
}) {
  const choices = options.length ? options : [fallbackVisaOption(destination)];
  const startId =
    initialOptionId && choices.some((item) => item.id === initialOptionId)
      ? initialOptionId
      : (choices.find((item) => item.isDefault)?.id ?? choices[0]?.id ?? "");
  const [optionId, setOptionId] = useState(startId);
  const option = choices.find((item) => item.id === optionId) ?? choices[0]!;
  const [express, setExpress] = useState(Boolean(existingExpress && existingOptionId === option.id && option.expressHours != null));
  const [dialog, setDialog] = useState(Boolean(applyOpen));
  const [bar, setBar] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);
  const now = new Date(nowIso);
  const hours = optionHours(option, express);
  const due = guaranteedDate(hours, now);
  const fee = optionTotal(option, express);
  const country = localizedDestinationName(destination, locale);
  const typeName = visaTypeLabel(option.visaType, locale);
  const documents = option.documents?.length ? option.documents : destination.documents;
  const resume = Boolean(existingId && existingOptionId === option.id && Boolean(existingExpress) === express);
  const standardDue = guaranteedDate(option.processingHours ?? 72, now);
  const expressDue = option.expressHours != null ? guaranteedDate(option.expressHours, now) : null;
  const required = destination.visaRequired;
  const many = choices.length > 1;

  useEffect(() => {
    const node = ctaRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setBar(Boolean(entry && !entry.isIntersecting)));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  function chooseOption(id: string) {
    const next = choices.find((item) => item.id === id);
    if (!next) return;
    setOptionId(id);
    setExpress((current) => Boolean(current && next.expressHours != null));
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("type", id);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }

  const tabs = [
    many && { id: "types", label: c(locale, "tabTypes") },
    required && { id: "speed", label: c(locale, "tabSpeed") },
    required && { id: "documents", label: c(locale, "tabDocs") },
    required && { id: "steps", label: c(locale, "tabSteps") },
    reviews.length > 0 && { id: "reviews", label: c(locale, "tabReviews") },
    faqs.length > 0 && { id: "faq", label: c(locale, "tabFaq") },
  ].filter((item): item is { id: string; label: string } => Boolean(item));

  const first = many ? 2 : 1;
  const steps = [
    { icon: stepIcons[0]!, label: tf(locale, "visa.step", { n: 1 }), title: tf(locale, "visa.step1", { name: brandName }), body: t(locale, "visa.step1Body") },
    { icon: stepIcons[1]!, label: tf(locale, "visa.step", { n: 2 }), title: t(locale, "visa.step2"), body: tf(locale, "visa.step2Body", { name: brandName }) },
    { icon: stepIcons[2]!, label: tf(locale, "visa.step", { n: 3 }), title: t(locale, "visa.step3"), body: tf(locale, "visa.step3Body", { country }) },
    { icon: stepIcons[3]!, label: tf(locale, "visa.step", { n: 4 }), title: tf(locale, "visa.step4", { date: formatAt(due, locale) }), body: t(locale, "visa.step4Body"), accent: true },
  ];

  return (
    <MotionConfig reducedMotion="user">
      <style>{previewStyles}</style>
      <div className={cn("mx-auto w-full min-w-0 max-w-6xl px-4 pt-4 pb-32 lg:px-0 lg:pb-20", isArabicLocale(locale) && "vp-ar")}>
        <Hero destination={destination} locale={locale} option={option} typeName={typeName} hours={hours} documents={documents} />

        <div className="grid items-start gap-x-10 lg:grid-cols-[minmax(0,1fr)_400px]">
          {required ? (
            <aside className="relative z-20 -mt-16 min-w-0 max-lg:mx-1 sm:-mt-20 lg:sticky lg:top-[96px] lg:col-start-2 lg:row-start-1 lg:-mt-[150px]">
              <VisaPass
                locale={locale}
                code={destination.code}
                englishName={destination.name}
                country={country}
                flag={destination.flag}
                option={option}
                typeName={typeName}
                express={express}
                due={due}
                hours={hours}
                fee={fee}
                resumeHref={resume && existingId ? `/${locale}/apply/${existingId}` : null}
                onStart={() => setDialog(true)}
                ctaRef={ctaRef}
                whatsapp={whatsapp}
              />
            </aside>
          ) : null}

          <div className="min-w-0 pt-6 lg:col-start-1 lg:row-start-1 lg:pt-8">
            {tabs.length > 1 ? <SectionTabs items={tabs} /> : null}

            {many ? (
              <section id="types" className="scroll-mt-36 pt-8">
                <StepHeading n={1} title={c(locale, "stepTypes")} body={c(locale, "stepTypesBody")} />
                <div className="mt-5">
                  <TypePicker options={choices} selectedId={option.id} onSelect={chooseOption} locale={locale} />
                </div>
              </section>
            ) : null}

            {required ? (
              <>
                <section id="speed" className="scroll-mt-36 pt-12">
                  <StepHeading n={first} title={c(locale, "stepSpeed")} body={c(locale, "stepSpeedBody")} />
                  <div className="mt-5">
                    <SpeedPicker option={option} express={express} onExpress={setExpress} locale={locale} now={now} standardDue={standardDue} expressDue={expressDue} />
                  </div>
                </section>

                <section id="documents" className="scroll-mt-36 pt-12">
                  <StepHeading n={first + 1} title={c(locale, "stepDocs")} body={c(locale, "stepDocsBody")} />
                  <div className="mt-5">
                    <DocumentsList documents={documents} locale={locale} custom={Boolean(option.documents?.length)} />
                  </div>
                </section>

                <Reveal className="pt-12">
                  <TrustBand locale={locale} approvalRate={approvalRate} brandName={brandName} country={country} />
                </Reveal>

                <section id="steps" className="scroll-mt-36 pt-12">
                  <SectionTitle>{c(locale, "stepsTitle")}</SectionTitle>
                  <HowItWorks steps={steps} />
                </section>
              </>
            ) : (
              <section className="pt-10">
                <p className="rounded-2xl bg-[#e9f9ef] px-5 py-4 font-semibold text-[#14713a]">{t(locale, "card.noVisa")}</p>
              </section>
            )}

            {reviews.length ? (
              <section id="reviews" className="scroll-mt-36 pt-14">
                <ReviewsCarousel reviews={reviews} locale={locale} country={country} />
              </section>
            ) : null}

            {required && destination.rejectionReasons.length ? (
              <section className="pt-14">
                <SectionTitle>{c(locale, "rejectTitle")}</SectionTitle>
                <p className="mt-1 text-sm text-muted-ink">{tf(locale, "visa.factors", { type: typeName })}</p>
                <Rejections destination={destination} locale={locale} />
              </section>
            ) : null}

            {faqs.length ? (
              <section id="faq" className="scroll-mt-36 pt-14">
                <SectionTitle>{t(locale, "visa.faq")}</SectionTitle>
                <FaqSection faqs={faqs} locale={locale} country={country} />
              </section>
            ) : null}

            {nearby.length ? (
              <section className="pt-14">
                <SectionTitle>{c(locale, "nearbyTitle", { name: country })}</SectionTitle>
                <NearbyStrip nearby={nearby} locale={locale} />
              </section>
            ) : null}

            <section className="pt-14">
              <SourcesPanel destination={destination} locale={locale} brandName={brandName} />
            </section>
          </div>
        </div>
      </div>

      {required ? <StickyBar show={bar} locale={locale} option={option} fee={fee} due={due} resumeHref={resume && existingId ? `/${locale}/apply/${existingId}` : null} onStart={() => setDialog(true)} /> : null}
      {required ? <ApplyDialog open={dialog} onOpenChange={setDialog} destination={destination} option={option} locale={locale} express={express} now={now} /> : null}
    </MotionConfig>
  );
}

function Hero({
  destination,
  locale,
  option,
  typeName,
  hours,
  documents,
}: {
  destination: Destination;
  locale: string;
  option: VisaOption;
  typeName: string;
  hours: number;
  documents: string[];
}) {
  const arabic = isArabicLocale(locale);
  const name = localizedDestinationName(destination, locale);
  const poster = destination.heroImage || destination.image || undefined;
  const words = c(locale, "title", { name }).split(" ");
  const stay = localizedPhrase(option.stay, locale, option.stayAr);
  const method = destination.visaRequired ? localizedPhrase(option.method, locale, option.methodAr) : "";
  const chips: { icon: ComponentType<{ className?: string }>; text: string }[] = destination.visaRequired
    ? [
        { icon: ShieldCheck, text: typeName },
        ...(stay ? [{ icon: CalendarDays, text: c(locale, "stayUpTo", { value: stay }) }] : []),
        { icon: Timer, text: processingLabel(hours, locale) },
        { icon: FileText, text: documents.length === 1 ? c(locale, "docsCountOne") : c(locale, "docsCount", { n: documents.length }) },
      ]
    : [{ icon: ShieldCheck, text: t(locale, "card.noVisa") }];
  return (
    <section className="relative isolate h-[420px] overflow-hidden rounded-[28px] bg-[#16182b] sm:h-[460px] lg:h-[520px]">
      <motion.div className="absolute inset-0" initial={{ scale: 1.14 }} animate={{ scale: 1 }} transition={{ duration: 2.4, ease: easeOut }}>
        {destination.videoUrl ? (
          <video className="size-full object-cover" autoPlay muted loop playsInline poster={poster} src={destination.videoUrl} />
        ) : poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt="" className="size-full object-cover" />
        ) : null}
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#0b0d1d] via-[#0b0d1d]/45 to-[#0b0d1d]/15" />

      <nav aria-label="breadcrumb" className="absolute top-5 start-5 flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1.5 text-xs text-white/85 backdrop-blur-md">
        <Link href={href("/", locale)} className="hover:text-white">
          {c(locale, "home")}
        </Link>
        <ChevronRight className="size-3 opacity-60" />
        <span className="font-medium text-white">{name}</span>
      </nav>

      <div className="absolute inset-x-0 bottom-0 px-5 pb-24 sm:px-8 sm:pb-28 lg:pe-[460px] lg:pb-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOut }}
          className="flex items-center gap-2.5 text-sm font-medium text-white/85"
        >
          {destination.flag ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={destination.flag} alt="" className="size-7 rounded-full object-cover ring-2 ring-white/70" />
          ) : null}
          {method ? <FlipText text={method} /> : null}
        </motion.div>
        <h1 dir={arabic ? "rtl" : undefined} className="mt-3 text-left text-[34px] leading-[1.12] font-semibold tracking-tight text-white sm:text-5xl lg:text-[56px]">
          {words.map((word, index) => (
            <span key={`${word}-${index}`} className="inline-block overflow-hidden pb-1 align-bottom">
              <motion.span
                className="inline-block me-[0.26em]"
                initial={{ y: "105%" }}
                animate={{ y: "0%" }}
                transition={{ duration: 0.7, delay: 0.15 + index * 0.08, ease: easeOut }}
              >
                {word}
              </motion.span>
            </span>
          ))}
        </h1>
        <ul className="mt-5 flex flex-wrap gap-2">
          {chips.map((chip, index) => (
            <motion.li
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.55 + index * 0.07, ease: easeOut }}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-md"
            >
              <chip.icon className="size-4 text-[#ffd873]" />
              <FlipText text={chip.text} />
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function StickyBar({
  show,
  locale,
  option,
  fee,
  due,
  resumeHref,
  onStart,
}: {
  show: boolean;
  locale: string;
  option: VisaOption;
  fee: number;
  due: Date;
  resumeHref: string | null;
  onStart: () => void;
}) {
  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          initial={{ y: "110%" }}
          animate={{ y: 0 }}
          exit={{ y: "110%" }}
          transition={{ duration: 0.32, ease: easeOut }}
          className={cn(
            "fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden",
            isArabicLocale(locale) && "vp-ar",
          )}
        >
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <div className="min-w-0">
              <p className="text-lg leading-tight font-semibold text-[#16182b]">
                <AnimatedMoney value={fee} currency={option.currency} locale={locale} />
              </p>
              <p className="truncate text-xs text-muted-ink">
                <FlipText text={c(locale, "stickyTarget", { date: shortDate(due, locale) })} />
              </p>
            </div>
            {resumeHref ? (
              <a href={resumeHref} className="ms-auto flex h-12 shrink-0 items-center rounded-full bg-brand px-6 font-semibold text-white">
                {t(locale, "visa.resume")}
              </a>
            ) : (
              <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={onStart} className="ms-auto h-12 shrink-0 rounded-full bg-brand px-6 font-semibold text-white">
                {t(locale, "visa.start")}
              </motion.button>
            )}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

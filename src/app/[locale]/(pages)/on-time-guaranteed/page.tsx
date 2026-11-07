import Link from "next/link";
import type { ReactNode } from "react";
import { BadgeCheck, CalendarCheck2, Clock3, ReceiptText, UserRoundCheck } from "lucide-react";
import { localizedMetadata } from "@/lib/seo";
import type { Page } from "@/lib/page";
import { Logo } from "@/components/brand/logo";
import { InfoContainer, TrustNav, infoOnDark } from "@/components/info/kit";
import { OnTimeCircles } from "@/components/marketing/on-time-circles";
import { formatCount, formatPercent } from "@/components/trust/format";
import { getSiteSettings } from "@/lib/data/settings";
import { linesOf } from "@/lib/cms/registry";
import { requirePageContent } from "@/lib/data/pages";
import { ON_TIME_MIN_DECIDED, onTimePerformance } from "@/lib/data/trust";
import { href } from "@/lib/href";
import { t } from "@/lib/i18n";
import { say } from "@/lib/say";
import { cn } from "@/lib/utils";

function Asterisk() {
  return (
    <span className="absolute -end-5 top-1 size-6 md:-end-9 md:top-2 md:size-10" aria-hidden>
      <span className="absolute inset-x-[42%] inset-y-0 rounded-full bg-[#ffd873]" />
      <span className="absolute inset-x-[42%] inset-y-0 rotate-60 rounded-full bg-[#ffd873]" />
      <span className="absolute inset-x-[42%] inset-y-0 -rotate-60 rounded-full bg-[#ffd873]" />
    </span>
  );
}

function stepsOf(value: string | undefined) {
  return linesOf(value)
    .filter((parts) => parts[0])
    .map((parts) => ({ title: parts[0]!, body: parts.slice(1).join(" | ") }));
}

function BlueSteps({ items }: { items: { title: string; body: string }[] }) {
  return (
    <ol className="grid gap-3 md:grid-cols-3">
      {items.map((item, index) => (
        <li key={`${item.title}-${index}`} className="min-w-0 rounded-[22px] bg-white p-5 shadow-[0_1px_0_rgba(37,99,235,0.08)] md:p-6">
          <span className="flex size-9 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white tabular-nums">{index + 1}</span>
          <p className="mt-4 text-lg font-bold text-blue-700">{item.title}</p>
          {item.body ? <p className="mt-1.5 text-sm leading-relaxed text-[#1e2a55]/80">{item.body}</p> : null}
        </li>
      ))}
    </ol>
  );
}

function Band({ id, title, body, children, className }: { id?: string; title: string; body?: string; children?: ReactNode; className?: string }) {
  return (
    <section id={id} className={cn("scroll-mt-24 py-12 md:py-16", className)}>
      <InfoContainer>
        <h2 className="max-w-3xl text-3xl leading-tight font-black tracking-tight text-blue-600 md:text-5xl">{title}</h2>
        {body ? <p className="mt-4 max-w-2xl text-base leading-relaxed font-medium text-[#1e2a55]/85 md:text-lg">{body}</p> : null}
        {children ? <div className="mt-8">{children}</div> : null}
      </InfoContainer>
    </section>
  );
}

export async function generateMetadata({ params }: Page) {
  const { locale } = await params;
  return localizedMetadata(locale, "/on-time-guaranteed", { en: "On Time Guaranteed", ar: "في الموعد" });
}

export default async function OnTimePage({ params }: Page) {
  const { locale } = await params;
  const [content, settings, performance] = await Promise.all([
    requirePageContent("on-time-guaranteed"),
    getSiteSettings(),
    onTimePerformance().catch(() => null),
  ]);
  const missed = linesOf(content.cases).filter((parts) => parts[0]);
  const calcSteps = stepsOf(content.calcSteps);
  const lateSteps = stepsOf(content.lateSteps);
  const showStats = performance !== null && performance.decided >= ON_TIME_MIN_DECIDED;
  const account = href("/account", locale);
  const facts = [
    { icon: CalendarCheck2, text: say(locale, "Shown before you pay", "يظهر قبل الدفع") },
    { icon: Clock3, text: say(locale, "Counted from payment", "يُحسب من وقت الدفع") },
    { icon: UserRoundCheck, text: say(locale, "Worked on by a person", "يتابعه شخص من الفريق") },
    { icon: ReceiptText, text: say(locale, "Late? Ask for a refund", "تأخر؟ اطلب الاسترداد") },
  ];

  return (
    <div className="bg-[#fbf0e1]">
      <section className="relative overflow-hidden bg-blue-600 text-white">
        <InfoContainer className="grid items-center gap-10 pt-12 pb-14 md:pt-16 md:pb-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Logo name={settings.name} src={settings.logoUrl} className="text-white" />
              <span className="text-[8px] leading-[1.05] font-bold tracking-[0.12em] uppercase">
                {t(locale, "ontime.visasOn")}
                <br />
                {t(locale, "ontime.word")}
              </span>
            </div>
            <h1 className="mt-8 text-5xl leading-[1.05] font-black tracking-tight md:text-7xl lg:text-8xl">
              <span className="block">{content.hero1}</span>
              <span className="relative inline-block">
                {content.hero2}
                <Asterisk />
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed font-medium text-white/85 md:text-xl">{content.heroBody}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={account} className={infoOnDark}>
                {say(locale, "Track my application", "تابع طلبي")}
              </Link>
              <a href="#how" className="inline-flex h-11 items-center justify-center rounded-full border border-white/30 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10">
                {say(locale, "How the date is set", "كيف يُحدَّد الموعد")}
              </a>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[320px] min-w-0 sm:max-w-[400px]">
            <OnTimeCircles className="absolute inset-0 m-auto w-full" />
            <div className="relative flex aspect-square items-center justify-center p-6 sm:p-10">
              <div className="w-full max-w-[280px] rounded-[22px] bg-white p-5 text-[#16182b] shadow-[0_20px_50px_-20px_rgba(15,23,42,0.45)]">
                <p className="text-xs font-semibold text-blue-700">{say(locale, "Your target date", "موعدك المستهدف")}</p>
                <ol className="mt-3 space-y-3 text-sm">
                  {[
                    say(locale, "Pick the visa type", "اختر نوع التأشيرة"),
                    say(locale, "Pay, and the clock starts", "ادفع، ويبدأ العد"),
                    say(locale, "Follow it in your account", "تابعه من حسابك"),
                  ].map((line, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold", index === 2 ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700")}>{index + 1}</span>
                      <span className="font-medium">{line}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </InfoContainer>
      </section>

      <div className="border-b border-blue-600/10 bg-white/60">
        <InfoContainer>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-3 py-5 md:grid-cols-4">
            {facts.map((fact) => (
              <li key={fact.text} className="flex min-w-0 items-center gap-2.5 text-sm font-semibold text-blue-700">
                <fact.icon aria-hidden className="size-5 shrink-0" />
                <span className="min-w-0">{fact.text}</span>
              </li>
            ))}
          </ul>
        </InfoContainer>
      </div>

      <Band id="how" title={content.band2Title} body={content.band2Body}>
        {calcSteps.length ? <BlueSteps items={calcSteps} /> : null}
      </Band>

      {showStats && performance ? (
        <section className="pb-12 md:pb-16">
          <InfoContainer>
            <div className="grid min-w-0 gap-6 rounded-[26px] bg-blue-600 p-6 text-white md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-10">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#ffd873]">{say(locale, "Our record so far", "سجلنا حتى الآن")}</p>
                <p className="mt-2 text-2xl font-black md:text-3xl">
                  {say(
                    locale,
                    `${formatPercent(locale, performance.onTime / performance.decided)} of applications met the target date`,
                    `${formatPercent(locale, performance.onTime / performance.decided)} من الطلبات التزمت بالموعد المستهدف`,
                  )}
                </p>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/75">
                  {say(
                    locale,
                    `Counted from ${formatCount(locale, performance.decided)} paid applications with a known outcome: ${formatCount(locale, performance.onTime)} decided by the target date, ${formatCount(locale, performance.late)} decided late or still open after it.`,
                    `محسوبة على الطلبات المدفوعة معروفة النتيجة (${formatCount(locale, performance.decided)}): ${formatCount(locale, performance.onTime)} صدر قرارها قبل الموعد، و${formatCount(locale, performance.late)} تأخر قرارها أو بقيت مفتوحة بعده.`,
                  )}
                </p>
              </div>
              <div className="flex gap-3">
                <div className="min-w-0 rounded-[18px] bg-white/10 px-5 py-4 text-center">
                  <p className="text-3xl font-black tabular-nums">{formatCount(locale, performance.onTime)}</p>
                  <p className="mt-1 text-xs text-white/70">{say(locale, "On time", "في الموعد")}</p>
                </div>
                <div className="min-w-0 rounded-[18px] bg-white/10 px-5 py-4 text-center">
                  <p className="text-3xl font-black tabular-nums">{formatCount(locale, performance.late)}</p>
                  <p className="mt-1 text-xs text-white/70">{say(locale, "Late", "متأخر")}</p>
                </div>
              </div>
            </div>
          </InfoContainer>
        </section>
      ) : null}

      <Band title={content.band1Title} body={content.band1Body} className="bg-white/50">
        {lateSteps.length ? <BlueSteps items={lateSteps} /> : null}
        <p className="mt-6 text-sm text-[#1e2a55]/80">
          <Link href={href("/transparency/refunds-policy", locale)} className="font-semibold text-blue-700 hover:underline">
            {say(locale, "Read the refunds policy", "اقرأ سياسة الاسترداد")}
          </Link>
        </p>
      </Band>

      <Band title={content.band3Title} body={content.band3Body}>
        <div className="flex min-w-0 flex-col gap-4 rounded-[22px] bg-white p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
          <div className="flex min-w-0 items-start gap-3">
            <BadgeCheck aria-hidden className="mt-0.5 size-6 shrink-0 text-blue-600" />
            <p className="text-sm leading-relaxed text-[#1e2a55]/85">
              {say(locale, "Each application in your account shows its target date and the latest status from our team.", "كل طلب في حسابك يعرض موعده المستهدف وآخر حالة من الفريق.")}
            </p>
          </div>
          <Link href={account} className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-blue-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-700">
            {say(locale, "Open my account", "افتح حسابي")}
          </Link>
        </div>
      </Band>

      <Band title={content.missedTitle} body={[content.missed1, content.missed2].filter(Boolean).join(" ")} className="bg-white/50">
        {missed.length ? (
          <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {missed.map(([name, late, reason], index) => (
              <li key={`${name}-${index}`} className="min-w-0 rounded-[22px] bg-blue-600 p-5 text-white">
                <p className="text-sm font-bold tracking-wide uppercase">{name}</p>
                {late ? <p className="mt-2 text-lg font-black">{late}</p> : null}
                {reason ? <p className="mt-1 text-sm leading-relaxed text-white/80">{reason}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-[18px] border border-dashed border-blue-600/25 px-5 py-4 text-sm text-[#1e2a55]/75">
            {say(locale, "Missed dates are listed here when the team records them.", "تظهر هنا المواعيد التي فاتت عندما يسجّلها الفريق.")}
          </p>
        )}
      </Band>

      <section className="bg-blue-600 py-14 text-center text-white md:py-20">
        <InfoContainer narrow>
          <p className="text-4xl leading-tight font-black tracking-tight md:text-6xl">{content.hero1}</p>
          <p className="text-4xl leading-tight font-black tracking-tight text-[#ffd873] md:text-6xl">{content.hero2}</p>
          {content.ctaTitle ? <h2 className="mt-8 text-xl font-bold md:text-2xl">{content.ctaTitle}</h2> : null}
          {content.ctaBody ? <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-white/80 md:text-base">{content.ctaBody}</p> : null}
          <Link href={account} className={`${infoOnDark} mt-7`}>
            {say(locale, "Open my account", "افتح حسابي")}
          </Link>
        </InfoContainer>
      </section>
      <TrustNav locale={locale} current="/on-time-guaranteed" />
    </div>
  );
}

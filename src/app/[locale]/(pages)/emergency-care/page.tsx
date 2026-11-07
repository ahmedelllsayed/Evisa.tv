import Link from "next/link";
import { localizedMetadata } from "@/lib/seo";
import type { Page } from "@/lib/page";
import { ContactForm } from "@/components/contact/contact-form";
import { ChannelIcon, ChannelList, configuredChannels } from "@/components/help/channels";
import { Badge, Callout, InfoCard, InfoHero, InfoSection, StatGrid, infoOnDark, infoSecondary } from "@/components/info/kit";
import { MediaImage } from "@/components/media-image";
import { linesOf } from "@/lib/cms/registry";
import { flagUrl } from "@/lib/countries";
import { getCurrentUser } from "@/lib/auth";
import { listDestinations } from "@/lib/data/catalog";
import { fastestDestinations } from "@/lib/data/help";
import { requirePageContent } from "@/lib/data/pages";
import { getSiteSettings } from "@/lib/data/settings";
import { href, visaHref } from "@/lib/href";
import { localizedDestinationName } from "@/lib/localize";
import { say } from "@/lib/say";
import { durationLabel } from "@/components/help/duration";

export async function generateMetadata({ params }: Page) {
  const { locale } = await params;
  return localizedMetadata(locale, "/emergency-care", { en: "Emergency Helpline", ar: "الطوارئ" });
}

export default async function EmergencyPage({ params }: Page) {
  const { locale } = await params;
  const [content, settings, destinations, user] = await Promise.all([
    requirePageContent("emergency-care"),
    getSiteSettings(),
    listDestinations(),
    getCurrentUser(),
  ]);
  const channels = configuredChannels(settings, locale, ["phone", "whatsapp", "support", "general"]);
  const quick = channels.filter((c) => c.kind !== "general").slice(0, 3);
  const criteria = linesOf(content.criteria).map(([title, body]) => ({ title: title ?? "", body: body ?? "" }));
  const ready = linesOf(content.ready).map(([item]) => item ?? "").filter(Boolean);
  const expectations = linesOf(content.expectations).map(([title, body]) => ({ title: title ?? "", body }));
  const fastest = fastestDestinations(destinations);
  const withExpress = destinations.filter((d) => d.isActive && d.visaRequired && d.expressHours !== null).length;
  const quickestStandard = destinations
    .filter((d) => d.isActive && d.visaRequired && d.processingHours !== null)
    .reduce<number | null>((min, d) => (min === null || d.processingHours! < min ? d.processingHours! : min), null);

  const stats = [
    ...(quickestStandard !== null ? [{ value: durationLabel(quickestStandard, locale), label: say(locale, "Quickest standard processing target", "أسرع مدة معالجة عادية مستهدفة") }] : []),
    ...(withExpress ? [{ value: withExpress, label: say(locale, "Destinations with an express option", "وجهات بها خيار سريع") }] : []),
    ...linesOf(content.stats).map(([value, label]) => ({ value: value ?? "", label: label ?? "" })),
  ].slice(0, 4);

  return (
    <>
      <InfoHero
        tone="dark"
        kicker={say(locale, "Emergency help", "مساعدة عاجلة")}
        title={content.title}
        intro={content.body}
        actions={
          <>
            <a href="#urgent" className={infoOnDark}>
              {say(locale, "Send an urgent request", "أرسل طلباً عاجلاً")}
            </a>
            {quick.map((channel) => (
              <a
                key={channel.kind}
                href={channel.href}
                {...(channel.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="inline-flex h-11 min-w-0 max-w-full items-center gap-2 rounded-full border border-white/20 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                <ChannelIcon kind={channel.kind} />
                <span className="truncate">{channel.ltr ? <bdi dir="ltr">{channel.value}</bdi> : channel.value}</span>
              </a>
            ))}
          </>
        }
        aside={
          ready.length ? (
            <InfoCard tone="dark">
              <p className="text-sm font-semibold text-[#ffd873]">{say(locale, "Have these ready", "جهّز هذه قبل التواصل")}</p>
              <ul className="mt-4 space-y-3">
                {ready.map((item) => (
                  <li key={item} className="flex gap-3 text-sm text-white/80">
                    <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#ffd873]" />
                    <span className="min-w-0">{item}</span>
                  </li>
                ))}
              </ul>
            </InfoCard>
          ) : undefined
        }
      />

      {stats.length ? (
        <InfoSection className="pb-0 md:pb-0">
          <StatGrid items={stats} />
        </InfoSection>
      ) : null}

      {criteria.length ? (
        <InfoSection
          title={say(locale, "What counts as urgent", "ما الذي يُعد عاجلاً")}
          hint={say(
            locale,
            "Requests sent from this page are marked urgent in the team inbox. Use it when one of these applies.",
            "الطلبات المرسلة من هذه الصفحة تصل إلى الفريق بعلامة عاجل. استخدمها إذا انطبقت عليك حالة من هذه.",
          )}
        >
          <ul className="grid gap-3 sm:grid-cols-2">
            {criteria.map((item, index) => (
              <li key={item.title} className="flex min-w-0 gap-4 rounded-[22px] border border-[#e3e5f2] bg-white p-5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-sm font-semibold text-rose-700 ring-1 ring-rose-200 ring-inset">
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-[#16182b]">{item.title}</span>
                  {item.body ? <span className="mt-1 block text-sm leading-relaxed text-body">{item.body}</span> : null}
                </span>
              </li>
            ))}
          </ul>
          <Callout
            accent="slate"
            className="mt-4"
            title={say(locale, "Not urgent?", "ليس أمراً عاجلاً؟")}
          >
            {say(
              locale,
              "Questions about fees, documents or a trip that is weeks away get a faster answer from the contact page and the visa pages.",
              "أسئلة الرسوم والمستندات أو السفر بعد أسابيع تجد إجابتها أسرع في صفحة التواصل وصفحات التأشيرات.",
            )}
            <span className="mt-3 flex flex-wrap gap-2">
              <Link href={href("/contact", locale)} className={infoSecondary}>
                {say(locale, "Contact page", "صفحة التواصل")}
              </Link>
              <Link href={href("/tools/visa-requirements", locale)} className={infoSecondary}>
                {say(locale, "Visa requirements", "متطلبات التأشيرة")}
              </Link>
            </span>
          </Callout>
        </InfoSection>
      ) : null}

      {fastest.length ? (
        <InfoSection
          title={say(locale, "Quickest destinations to apply for", "أسرع الوجهات في المعالجة")}
          hint={say(
            locale,
            "Processing targets published on each visa page. The issuing authority can take longer.",
            "المدد المستهدفة المنشورة في صفحة كل تأشيرة. قد تستغرق الجهة المختصة وقتاً أطول.",
          )}
        >
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {fastest.map((d) => (
              <li key={d.id} className="min-w-0">
                <Link
                  href={visaHref(d.slug, locale)}
                  className="group flex h-full min-w-0 flex-col rounded-[22px] border border-[#e3e5f2] bg-white p-5 transition-colors hover:border-brand-200 hover:bg-brand-50/30"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface ring-1 ring-[#e3e5f2]">
                      <MediaImage src={d.flag || flagUrl(d.code, 80)} alt="" width={36} height={36} className="size-9 object-cover" />
                    </span>
                    <span className="min-w-0 truncate font-semibold text-[#16182b]">{localizedDestinationName(d, locale)}</span>
                  </span>
                  <span className="mt-4 flex flex-wrap gap-2">
                    {d.processingHours !== null ? (
                      <Badge accent="slate">
                        {say(locale, "Standard", "عادي")}: {durationLabel(d.processingHours, locale)}
                      </Badge>
                    ) : null}
                    {d.expressHours !== null ? (
                      <Badge accent="amber">
                        {say(locale, "Express", "سريع")}: {durationLabel(d.expressHours, locale)}
                      </Badge>
                    ) : null}
                  </span>
                  <span className="mt-auto pt-4 text-sm font-semibold text-brand-700 group-hover:underline">
                    {say(locale, "Open the visa page", "افتح صفحة التأشيرة")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </InfoSection>
      ) : null}

      <InfoSection
        id="urgent"
        title={say(locale, "Send an urgent request", "أرسل طلباً عاجلاً")}
        hint={say(locale, "It goes to the same inbox as the contact form, marked as urgent.", "يصل إلى صندوق رسائل الفريق نفسه، مع علامة عاجل.")}
      >
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] lg:items-start">
          <ContactForm
            locale={locale}
            initialTopic="urgent"
            lockTopic
            user={user ? { name: user.fullName ?? "", email: user.email } : null}
            returnPath="/emergency-care#urgent"
            responseNote={say(locale, "A person reads every urgent request.", "يقرأ أحد أفراد الفريق كل طلب عاجل.")}
          />
          <div className="min-w-0 space-y-4">
            {expectations.length ? (
              <InfoCard>
                <p className="text-sm font-semibold text-[#16182b]">{say(locale, "What happens next", "ماذا يحدث بعد الإرسال")}</p>
                <ol className="mt-4 space-y-4">
                  {expectations.map((step, index) => (
                    <li key={step.title} className="flex gap-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">{index + 1}</span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-[#16182b]">{step.title}</span>
                        {step.body ? <span className="mt-0.5 block text-sm leading-relaxed text-body">{step.body}</span> : null}
                      </span>
                    </li>
                  ))}
                </ol>
              </InfoCard>
            ) : null}
            {channels.length ? (
              <InfoCard>
                <p className="mb-4 text-sm font-semibold text-[#16182b]">{say(locale, "Reach us directly", "تواصل معنا مباشرة")}</p>
                <ChannelList channels={channels} />
              </InfoCard>
            ) : null}
          </div>
        </div>
      </InfoSection>
    </>
  );
}

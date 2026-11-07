import Link from "next/link";
import { localizedMetadata } from "@/lib/seo";
import type { Page } from "@/lib/page";
import { ContactForm } from "@/components/contact/contact-form";
import { isContactTopic } from "@/components/contact/topics";
import { ChannelList, configuredChannels } from "@/components/help/channels";
import { Callout, InfoCard, InfoHero, InfoSection, infoSecondary } from "@/components/info/kit";
import { getCurrentUser } from "@/lib/auth";
import { listContactApplications } from "@/lib/data/help";
import { requirePageContent } from "@/lib/data/pages";
import { getSiteSettings } from "@/lib/data/settings";
import { href } from "@/lib/href";
import { t, type MessageKey } from "@/lib/i18n";
import { localizedDestinationName } from "@/lib/localize";
import { say } from "@/lib/say";

export async function generateMetadata({ params }: Page) {
  const { locale } = await params;
  return localizedMetadata(locale, "/contact", { en: "Contact", ar: "تواصل" });
}

export default async function ContactPage({ params, searchParams }: Page) {
  const { locale } = await params;
  const sp = await searchParams;
  const [content, settings, user] = await Promise.all([requirePageContent("contact"), getSiteSettings(), getCurrentUser()]);
  const applications = user ? await listContactApplications(user.id) : [];
  const options = applications.map((app) => ({
    id: app.id,
    reference: app.reference,
    label: [
      app.reference,
      localizedDestinationName({ name: app.destination, nameAr: app.destinationAr, code: app.destinationCode }, locale),
      t(locale, `status.${app.status}` as MessageKey),
    ].join(" · "),
  }));
  const topic = isContactTopic(sp.topic) ? sp.topic : "general";
  const requested = typeof sp.application === "string" ? sp.application : "";
  const initialApplicationId = options.some((app) => app.id === requested) ? requested : "";
  const channels = configuredChannels(settings, locale);

  return (
    <>
      <InfoHero kicker={say(locale, "Contact", "تواصل")} title={content.title} intro={content.intro} />
      <InfoSection className="pt-2 md:pt-4">
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] lg:items-start">
          <ContactForm
            locale={locale}
            heading={content.formHeading}
            initialTopic={topic}
            user={user ? { name: user.fullName ?? "", email: user.email } : null}
            applications={options}
            initialApplicationId={initialApplicationId}
            partnershipsEmail={settings.partnershipsEmail}
            responseNote={content.responseTime}
          />
          <aside className="min-w-0 space-y-4">
            <Callout
              accent="red"
              title={say(locale, "Travelling within days?", "مسافر خلال أيام؟")}
            >
              {say(locale, "Use the urgent path so your message is marked urgent with your travel date.", "استخدم المسار العاجل لتصل رسالتك بعلامة عاجل ومعها موعد سفرك.")}
              <span className="mt-3 flex">
                <Link href={href("/emergency-care", locale)} className={infoSecondary}>
                  {say(locale, "Emergency help", "خط الطوارئ")}
                </Link>
              </span>
            </Callout>
            {channels.length ? (
              <InfoCard>
                <h2 className="mb-4 text-sm font-semibold text-[#16182b]">{content.supportHeading}</h2>
                <ChannelList channels={channels} />
              </InfoCard>
            ) : null}
            {settings.offices.length ? (
              <InfoCard>
                <h2 className="text-sm font-semibold text-[#16182b]">{say(locale, "Offices", "المكاتب")}</h2>
                <ul className="mt-3 space-y-3">
                  {settings.offices.map((office) => (
                    <li key={`${office.city}-${office.address}`} className="min-w-0">
                      <p className="font-medium text-[#16182b]">{office.city}</p>
                      <p className="text-sm leading-relaxed text-body">{office.address}</p>
                    </li>
                  ))}
                </ul>
              </InfoCard>
            ) : null}
            <InfoCard>
              <h2 className="text-sm font-semibold text-[#16182b]">{say(locale, "Your data", "بياناتك")}</h2>
              <p className="mt-2 text-sm leading-relaxed text-body">
                {say(
                  locale,
                  "Never send passport scans or card numbers by message. Upload documents from your application page.",
                  "لا ترسل صور الجواز أو أرقام البطاقات في الرسالة. ارفع المستندات من صفحة طلبك.",
                )}
              </p>
              <Link href={href("/security", locale)} className="mt-3 inline-flex text-sm font-semibold text-brand-700 hover:underline">
                {say(locale, "How we protect your data", "كيف نحمي بياناتك")}
              </Link>
            </InfoCard>
          </aside>
        </div>
      </InfoSection>
    </>
  );
}

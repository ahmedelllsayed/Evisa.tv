import { localizedMetadata } from "@/lib/seo";
import type { Page } from "@/lib/page";
import { ContactForm } from "@/components/contact/contact-form";
import { requirePageContent } from "@/lib/data/pages";
import { getSiteSettings } from "@/lib/data/settings";
import { t } from "@/lib/i18n";


export async function generateMetadata({ params }: Page) {
  const { locale } = await params;
  return localizedMetadata(locale, "/contact", { en: "Contact", ar: "تواصل" });
}

export default async function ContactPage({ params }: Page) {
  const { locale } = await params;
  const [content, settings] = await Promise.all([requirePageContent("contact"), getSiteSettings()]);
  return (
    <div className="min-h-[calc(100vh-72px)] bg-[#f7f8fa] px-6 py-16 lg:px-16">
      <div className="max-w-xl">
        <h1 className="font-sans text-4xl font-semibold tracking-tight">{content.title}</h1>
        <p className="mt-5 text-base leading-relaxed text-body">{content.intro}</p>
        <ContactForm locale={locale} />
        <h2 className="mt-10 text-sm font-semibold tracking-[0.14em] uppercase">{content.supportHeading}</h2>
        <ul className="mt-4 space-y-4 text-sm">
          <li>
            <a href={`mailto:${settings.generalEmail}`} className="font-medium underline">
              {settings.generalEmail}
            </a>
            <p className="text-muted-ink">{t(locale, "contact.general")}</p>
          </li>
          <li>
            <a href={`mailto:${settings.supportEmail}`} className="font-medium underline">
              {settings.supportEmail}
            </a>
            <p className="text-muted-ink">{t(locale, "contact.issues")}</p>
          </li>
          <li>
            <a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="font-medium">
              {settings.phone}
            </a>
            <p className="text-muted-ink">{t(locale, "contact.hours")}</p>
          </li>
        </ul>
        <ul className="mt-8 space-y-5">
          {settings.offices.map((office) => (
            <li key={office.city}>
              <p className="font-semibold">{office.city}</p>
              <p className="text-sm text-body">{office.address}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

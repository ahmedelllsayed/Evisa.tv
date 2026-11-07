import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { InfoContainer, InfoHero, ProseArticle, TrustNav } from "@/components/info/kit";
import { splitUpdated } from "@/components/trust/format";
import { href } from "@/lib/href";
import { currentLocale } from "@/lib/locale";
import { say } from "@/lib/say";

export type ProseRelated = { path: string; en: string; ar: string };

export async function CmsProse({
  title,
  intro,
  body,
  locale: localeProp,
  kicker,
  trustPath,
  related = [],
}: {
  title: string;
  intro?: string;
  body?: string;
  locale?: string;
  kicker?: string;
  trustPath?: string;
  related?: ProseRelated[];
}) {
  const locale = localeProp ?? (await currentLocale());
  const { updated, intro: lead } = splitUpdated(intro);
  const extras = (className: string) => (
    <div className={className}>
      {related.length ? (
        <div className="rounded-[18px] border border-[#e3e5f2] bg-white p-4">
          <p className="text-xs font-semibold text-muted-ink">{say(locale, "Related", "صفحات مرتبطة")}</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {related.map((item) => (
              <li key={item.path}>
                <Link href={href(item.path, locale)} className="text-body hover:text-brand-700">
                  {say(locale, item.en, item.ar)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="rounded-[18px] bg-[#f4f5fd] p-4 text-sm">
        <p className="font-semibold text-[#16182b]">{say(locale, "A question about this page?", "سؤال عن هذه الصفحة؟")}</p>
        <p className="mt-1 leading-relaxed text-body">{say(locale, "Write to us and a person on the team will reply.", "راسلنا وسيرد عليك أحد الفريق.")}</p>
        <Link href={href("/contact", locale)} className="mt-2 inline-block font-semibold text-brand-700 hover:underline">
          {say(locale, "Contact us", "تواصل معنا")}
        </Link>
      </div>
    </div>
  );
  return (
    <>
      <InfoHero kicker={kicker} title={title} intro={lead || undefined}>
        {updated ? (
          <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#e3e5f2] bg-white px-3.5 py-1.5 text-sm text-[#16182b]">
            <CalendarClock aria-hidden className="size-4 text-brand-700" />
            <span className="text-muted-ink">{say(locale, "Last updated", "آخر تحديث")}</span>
            <span className="font-semibold">{updated}</span>
          </p>
        ) : null}
      </InfoHero>
      {body?.trim() ? (
        <div className="pt-2">
          <ProseArticle locale={locale} body={body} aside={extras("mt-4 hidden space-y-4 lg:block")} />
          <InfoContainer className="-mt-4 pb-12 lg:hidden">{extras("grid gap-3 sm:grid-cols-2")}</InfoContainer>
        </div>
      ) : null}
      {trustPath ? <TrustNav locale={locale} current={trustPath} /> : null}
    </>
  );
}

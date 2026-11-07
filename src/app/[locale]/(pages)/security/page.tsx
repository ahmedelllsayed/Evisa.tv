import Link from "next/link";
import type { ReactNode } from "react";
import { localizedMetadata } from "@/lib/seo";
import type { Page } from "@/lib/page";
import { InfoContainer, InfoHero, InfoSection, ProseArticle, TrustNav, infoOnDark, infoPrimary, infoSecondary } from "@/components/info/kit";
import { requirePageContent } from "@/lib/data/pages";
import { getSiteSettings } from "@/lib/data/settings";
import { href } from "@/lib/href";
import { say } from "@/lib/say";

export async function generateMetadata({ params }: Page) {
  const { locale } = await params;
  return localizedMetadata(locale, "/security", { en: "Security", ar: "الأمان" });
}

const icon = (path: ReactNode) => (
  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {path}
  </svg>
);

function measures(locale: string) {
  return [
    {
      icon: icon(
        <>
          <rect x="3" y="4" width="18" height="7" rx="2" />
          <rect x="3" y="13" width="18" height="7" rx="2" />
          <path d="M7 7.5h.01M7 16.5h.01" />
        </>,
      ),
      title: say(locale, "Files stay on our servers", "الملفات على خوادمنا"),
      body: say(
        locale,
        "Passports, photos and issued visas are stored in Evisa's own Postgres database, next to your application. No outside file-sharing service.",
        "الجوازات والصور والتأشيرات الصادرة محفوظة في قاعدة بيانات Postgres الخاصة بـ Evisa بجانب طلبك، دون أي خدمة خارجية لمشاركة الملفات.",
      ),
    },
    {
      icon: icon(
        <>
          <path d="M9 4h6l1 3h3v13H5V7h3l1-3Z" />
          <path d="M9 12h6M9 16h4" />
        </>,
      ),
      title: say(locale, "Every staff view is logged", "كل فتح لملف يُسجَّل"),
      body: say(locale, "Each time a staff member opens one of your files, who and when is recorded.", "كلما فتح أحد الموظفين ملفاً من ملفاتك، يُسجَّل من فتحه ومتى."),
    },
    {
      icon: icon(
        <>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 20a6 6 0 0 1 12 0" />
          <path d="M17 11l2 2 3-3" />
        </>,
      ),
      title: say(locale, "Access by role", "صلاحيات حسب الدور"),
      body: say(locale, "Staff accounts have roles. Each role sees only the tools and data it needs.", "لكل حساب موظف دور محدد، ولا يرى كل دور إلا الأدوات والبيانات التي يحتاجها."),
    },
    {
      icon: icon(
        <>
          <rect x="4" y="10" width="16" height="10" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </>,
      ),
      title: say(locale, "One-time email codes", "رموز دخول لمرة واحدة"),
      body: say(
        locale,
        "No password to leak. You sign in with a code sent to your email, and repeated requests and guesses are limited.",
        "لا توجد كلمة مرور قد تتسرّب. تدخل برمز يصل إلى بريدك، والطلبات والمحاولات المتكررة محدودة.",
      ),
    },
    {
      icon: icon(
        <>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
          <path d="M14 3v5h5M9 14l2 2 4-4" />
        </>,
      ),
      title: say(locale, "Uploads checked by content", "فحص الملفات بمحتواها"),
      body: say(
        locale,
        "Each upload is checked by its real bytes, not its name. Only JPG, PNG, WebP or PDF under 10 MB is accepted.",
        "يُفحص كل ملف بمحتواه الفعلي لا باسمه. لا يُقبل إلا JPG أو PNG أو WebP أو PDF أقل من 10 ميجابايت.",
      ),
    },
    {
      icon: icon(
        <>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20M6 15h4" />
        </>,
      ),
      title: say(locale, "Cards stay with the provider", "البطاقة عند مزود الدفع"),
      body: say(locale, "Card details are typed on the payment provider's page. This site never sees or stores the full card number.", "تُكتب بيانات البطاقة في صفحة مزود الدفع. هذا الموقع لا يرى رقم البطاقة كاملاً ولا يحفظه."),
    },
    {
      icon: icon(
        <>
          <path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Z" />
          <path d="M9 12l2 2 4-4" />
        </>,
      ),
      title: say(locale, "HTTPS and browser guards", "اتصال مشفّر وحماية المتصفح"),
      body: say(
        locale,
        "Pages are served over HTTPS only and cannot be embedded in other sites, which blocks common tricks like clickjacking.",
        "الصفحات تُقدَّم عبر HTTPS فقط ولا يمكن تضمينها داخل مواقع أخرى، مما يمنع حيلاً شائعة مثل خداع النقر.",
      ),
    },
    {
      icon: icon(
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </>,
      ),
      title: say(locale, "Kept only as long as needed", "حفظ للمدة اللازمة فقط"),
      body: say(
        locale,
        "Passport files are kept to finish the application and meet record-keeping duties, then deleted or anonymised.",
        "تُحفظ ملفات الجواز لإنهاء الطلب والوفاء بالتزامات حفظ السجلات، ثم تُحذف أو تُجهَّل.",
      ),
    },
  ];
}

export default async function SecurityPage({ params }: Page) {
  const { locale } = await params;
  const [content, settings] = await Promise.all([requirePageContent("security"), getSiteSettings()]);
  const reportEmail = [settings.supportEmail, settings.generalEmail].map((value) => value.trim()).find((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) ?? "";
  const subject = encodeURIComponent(say(locale, "Security report", "بلاغ أمني"));
  const reportHref = reportEmail ? `mailto:${reportEmail}?subject=${subject}` : href("/contact", locale);

  return (
    <>
      <InfoHero
        kicker={say(locale, "Security", "الأمان")}
        title={content.title}
        intro={content.intro}
        actions={
          <>
            <a href="#measures" className={infoPrimary}>
              {say(locale, "See the measures", "اعرض الإجراءات")}
            </a>
            <a href="#report" className={infoSecondary}>
              {say(locale, "Report a problem", "أبلغ عن مشكلة")}
            </a>
          </>
        }
      />

      <InfoSection
        id="measures"
        title={say(locale, "What protects your documents", "ما الذي يحمي مستنداتك")}
        hint={say(locale, "Measures that are switched on today, described plainly.", "إجراءات مفعّلة اليوم، موصوفة ببساطة.")}
      >
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {measures(locale).map((item) => (
            <li key={item.title} className="flex min-w-0 gap-4 rounded-[22px] border border-[#e3e5f2] bg-white p-5 sm:block">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">{item.icon}</span>
              <span className="block min-w-0">
                <span className="block font-semibold text-[#16182b] sm:mt-4">{item.title}</span>
                <span className="mt-1.5 block text-sm leading-relaxed text-body">{item.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </InfoSection>

      {content.body ? (
        <section className="pt-4">
          <ProseArticle locale={locale} body={content.body} />
        </section>
      ) : null}

      <section id="report" className="scroll-mt-24 pb-14">
        <InfoContainer>
          <div className="grid min-w-0 gap-6 rounded-[26px] bg-[#16182b] px-6 py-8 text-white md:px-10 md:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#ffd873]">{say(locale, "Responsible disclosure", "الإفصاح المسؤول")}</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">{say(locale, "Found a security issue?", "وجدت ثغرة أمنية؟")}</h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70">
                {say(
                  locale,
                  "Tell us privately first and give us time to fix it before sharing it anywhere. We reply to every report.",
                  "أبلغنا بشكل خاص أولاً، وامنحنا وقتاً لإصلاحها قبل نشرها في أي مكان. نرد على كل بلاغ.",
                )}
              </p>
              <a href={reportHref} className={`${infoOnDark} mt-6 max-w-full`}>
                <span className="truncate">
                  {reportEmail ? (
                    <>
                      {say(locale, "Email ", "راسل ")}
                      <bdi dir="ltr">{reportEmail}</bdi>
                    </>
                  ) : (
                    say(locale, "Contact the team", "تواصل مع الفريق")
                  )}
                </span>
              </a>
            </div>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <div className="min-w-0 rounded-[18px] border border-white/10 bg-white/[0.06] p-5">
                <p className="font-semibold">{say(locale, "Please include", "أرسل معك")}</p>
                <ul className="mt-3 space-y-2 text-sm text-white/70">
                  <li>{say(locale, "The page or address affected", "الصفحة أو الرابط المتأثر")}</li>
                  <li>{say(locale, "Steps to reproduce it", "خطوات تكرار المشكلة")}</li>
                  <li>{say(locale, "What an attacker could do", "ما الذي يمكن أن يفعله المهاجم")}</li>
                </ul>
              </div>
              <div className="min-w-0 rounded-[18px] border border-white/10 bg-white/[0.06] p-5">
                <p className="font-semibold">{say(locale, "Please do not", "نرجو عدم")}</p>
                <ul className="mt-3 space-y-2 text-sm text-white/70">
                  <li>{say(locale, "Open or change other people's data", "فتح بيانات الآخرين أو تعديلها")}</li>
                  <li>{say(locale, "Slow down or overload the site", "إبطاء الموقع أو إغراقه بالطلبات")}</li>
                  <li>{say(locale, "Publish before it is fixed", "النشر قبل الإصلاح")}</li>
                </ul>
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-ink">
            {say(locale, "A question about your own account or files? ", "سؤال عن حسابك أو ملفاتك؟ ")}
            <Link href={href("/contact", locale)} className="font-semibold text-brand-700 hover:underline">
              {say(locale, "Use the contact page", "استخدم صفحة التواصل")}
            </Link>
          </p>
        </InfoContainer>
      </section>

      <TrustNav locale={locale} current="/security" />
    </>
  );
}

import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { CheckCircle2, CircleAlert, CircleX, RefreshCw } from "lucide-react";
import { localizedMetadata } from "@/lib/seo";
import type { Page } from "@/lib/page";
import { Badge, Callout, InfoHero, InfoSection, TrustNav, infoSecondary } from "@/components/info/kit";
import { timeAgo } from "@/components/trust/format";
import { runLiveChecks, type CheckState } from "@/components/trust/live-checks";
import { BUILTIN_PAGES, linesOf } from "@/lib/cms/registry";
import { localizeContent, requirePageContent } from "@/lib/data/pages";
import { href } from "@/lib/href";
import { say } from "@/lib/say";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/visa";

export async function generateMetadata({ params }: Page) {
  const { locale } = await params;
  return localizedMetadata(locale, "/transparency/status", { en: "Status", ar: "الحالة" });
}

/** The status page must still render when the database is the thing that is down. */
async function statusContent(locale: string) {
  try {
    return await requirePageContent("transparency/status");
  } catch (error) {
    unstable_rethrow(error);
    const builtin = BUILTIN_PAGES.find((page) => page.slug === "transparency/status")?.content ?? {};
    const content = localizeContent(builtin, locale);
    return { ...content, title: content.title || "Status" };
  }
}

type Row = { key: string; name: string; state: CheckState; value: string; detail: string };

const stateStyle: Record<CheckState, { icon: typeof CheckCircle2; dot: string; text: string }> = {
  ok: { icon: CheckCircle2, dot: "bg-emerald-500", text: "text-emerald-700" },
  warn: { icon: CircleAlert, dot: "bg-amber-500", text: "text-amber-800" },
  down: { icon: CircleX, dot: "bg-rose-500", text: "text-rose-700" },
};

export default async function StatusPage({ params }: Page) {
  await connection();
  const { locale } = await params;
  const [content, checks] = await Promise.all([statusContent(locale), runLiveChecks()]);
  const now = new Date();
  const { database, payments, email, pulse } = checks;

  const rows: Row[] = [
    {
      key: "website",
      name: say(locale, "Website", "الموقع"),
      state: "ok",
      value: say(locale, "Responding", "يعمل"),
      detail: say(locale, "Our server built this page for your request just now.", "أنشأ خادمنا هذه الصفحة لطلبك الآن."),
    },
    database.ok
      ? {
          key: "database",
          name: say(locale, "Applications and accounts", "الطلبات والحسابات"),
          state: (database.ms ?? 0) > 1500 ? "warn" : "ok",
          value: say(locale, `Responding in ${database.ms} ms`, `يستجيب خلال ${database.ms} مللي ثانية`),
          detail: say(locale, "A round trip to the database that stores applications, documents and pages.", "رحلة ذهاب وعودة إلى قاعدة البيانات التي تحفظ الطلبات والمستندات والصفحات."),
        }
      : {
          key: "database",
          name: say(locale, "Applications and accounts", "الطلبات والحسابات"),
          state: "down",
          value: say(locale, "Not responding", "لا يستجيب"),
          detail: say(locale, "Signing in and opening applications may fail right now. Your saved data is not lost.", "قد يتعذر الدخول وفتح الطلبات الآن. بياناتك المحفوظة لم تُفقد."),
        },
    payments.provider
      ? {
          key: "payments",
          name: say(locale, "Card payments", "الدفع بالبطاقة"),
          state: "ok",
          value: say(locale, "Set up", "مفعّل"),
          detail: say(
            locale,
            `Checkout goes through ${payments.provider === "paymob" ? "Paymob" : "Stripe"}. This checks the setup, not a live charge.`,
            `يتم الدفع عبر ${payments.provider === "paymob" ? "Paymob" : "Stripe"}. هذا فحص للإعداد، وليس عملية دفع فعلية.`,
          ),
        }
      : {
          key: "payments",
          name: say(locale, "Card payments", "الدفع بالبطاقة"),
          state: payments.production ? "down" : "warn",
          value: payments.production ? say(locale, "Not set up", "غير مفعّل") : say(locale, "Test mode", "وضع التجربة"),
          detail: payments.production
            ? say(locale, "Online payment is not available right now.", "الدفع الإلكتروني غير متاح الآن.")
            : say(locale, "No payment provider is set up, so checkout uses a test payment.", "لا يوجد مزود دفع مفعّل، لذا يستخدم الدفع عملية تجريبية."),
        },
    email.configured
      ? {
          key: "email",
          name: say(locale, "Email", "البريد الإلكتروني"),
          state: "ok",
          value: say(locale, "Set up", "مفعّل"),
          detail: say(locale, "Sign-in codes and status updates are sent by email.", "رموز الدخول وتحديثات الحالة تُرسل بالبريد."),
        }
      : {
          key: "email",
          name: say(locale, "Email", "البريد الإلكتروني"),
          state: "warn",
          value: say(locale, "Not set up", "غير مفعّل"),
          detail: say(locale, "Sign-in codes and status emails may not arrive. Updates still show in your account.", "قد لا تصل رموز الدخول ورسائل الحالة. التحديثات تظهر في حسابك."),
        },
  ];

  const down = rows.filter((row) => row.state === "down");
  const warn = rows.filter((row) => row.state === "warn");
  const overall: CheckState = down.length ? "down" : warn.length ? "warn" : "ok";
  const banner = {
    ok: { title: say(locale, "All checks passed", "كل الفحوص سليمة"), body: say(locale, "The website, applications, payments and email are working.", "الموقع والطلبات والدفع والبريد تعمل.") },
    warn: {
      title: say(locale, "Working, with limits", "يعمل مع بعض القيود"),
      body: say(locale, `Needs attention: ${warn.map((row) => row.name).join(", ")}.`, `يحتاج متابعة: ${warn.map((row) => row.name).join("، ")}.`),
    },
    down: {
      title: say(locale, "Part of the service is down", "جزء من الخدمة متوقف"),
      body: say(locale, `Not working: ${down.map((row) => row.name).join(", ")}.`, `لا يعمل: ${down.map((row) => row.name).join("، ")}.`),
    },
  }[overall];
  const BannerIcon = stateStyle[overall].icon;
  const notes = linesOf(content.systems).filter((parts) => parts[0]);
  const self = href("/transparency/status", locale);

  return (
    <>
      <InfoHero kicker={say(locale, "Transparency", "الشفافية")} title={content.title} intro={content.liveIntro || content.intro} />

      <InfoSection className="pt-0 md:pt-0">
        {content.notice ? (
          <Callout accent="amber" title={say(locale, "Notice from the team", "إشعار من الفريق")} className="mb-4">
            <p className="whitespace-pre-line">{content.notice}</p>
          </Callout>
        ) : null}

        <div
          role="status"
          className={cn(
            "flex min-w-0 flex-col gap-4 rounded-[22px] p-5 sm:flex-row sm:items-center sm:justify-between md:p-6",
            overall === "ok" ? "bg-emerald-600 text-white" : overall === "warn" ? "bg-amber-100 text-amber-950" : "bg-rose-600 text-white",
          )}
        >
          <div className="flex min-w-0 items-start gap-3">
            <BannerIcon aria-hidden className="mt-0.5 size-6 shrink-0" />
            <div className="min-w-0">
              <p className="text-lg font-semibold md:text-xl">{banner.title}</p>
              <p className="mt-1 text-sm opacity-90">{banner.body}</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3 text-sm">
            <span className="opacity-90">
              {say(locale, "Checked", "وقت الفحص")}: <time dateTime={now.toISOString()} className="font-semibold tabular-nums">{formatDateTime(now, locale)}</time>
            </span>
            <a
              href={self}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 font-semibold transition-colors",
                overall === "warn" ? "bg-amber-950/10 hover:bg-amber-950/15" : "bg-white/15 hover:bg-white/25",
              )}
            >
              <RefreshCw aria-hidden className="size-3.5" />
              {say(locale, "Check again", "افحص مرة أخرى")}
            </a>
          </div>
        </div>

        <ul className="mt-4 divide-y divide-[#eceef6] overflow-hidden rounded-[22px] border border-[#e3e5f2] bg-white">
          {rows.map((row) => {
            const style = stateStyle[row.state];
            return (
              <li key={row.key} className="grid min-w-0 gap-1 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6 md:px-6">
                <div className="min-w-0">
                  <p className="flex items-center gap-2.5 font-semibold text-[#16182b]">
                    <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", style.dot)} />
                    {row.name}
                  </p>
                  <p className="mt-1 ps-5 text-sm leading-relaxed text-muted-ink">{row.detail}</p>
                </div>
                <p className={cn("ps-5 text-sm font-semibold tabular-nums sm:ps-0", style.text)}>{row.value}</p>
              </li>
            );
          })}
        </ul>

        {pulse && (pulse.lastStaffUpdateAt || pulse.lastPaidAt) ? (
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {pulse.lastStaffUpdateAt ? (
              <div className="min-w-0 rounded-[18px] border border-[#e3e5f2] bg-white p-4">
                <dt className="text-sm text-body">{say(locale, "Last application update by the team", "آخر تحديث للطلبات من الفريق")}</dt>
                <dd className="mt-1 text-lg font-semibold text-[#16182b]">{timeAgo(locale, pulse.lastStaffUpdateAt, now)}</dd>
              </div>
            ) : null}
            {pulse.lastPaidAt ? (
              <div className="min-w-0 rounded-[18px] border border-[#e3e5f2] bg-white p-4">
                <dt className="text-sm text-body">{say(locale, "Last confirmed payment", "آخر دفع مؤكَّد")}</dt>
                <dd className="mt-1 text-lg font-semibold text-[#16182b]">{timeAgo(locale, pulse.lastPaidAt, now)}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </InfoSection>

      {notes.length ? (
        <InfoSection title={content.notesTitle || say(locale, "Notes from the team", "ملاحظات الفريق")} hint={content.intro} className="pt-0 md:pt-0">
          <ul className="grid gap-3 md:grid-cols-2">
            {notes.map((parts, index) => (
              <li key={`${parts[0]}-${index}`} className="min-w-0 rounded-[18px] border border-[#e3e5f2] bg-white p-4 md:p-5">
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 font-semibold text-[#16182b]">{parts[0]}</p>
                  {parts[1] ? <Badge>{parts[1]}</Badge> : null}
                </div>
                {parts[2] ? <p className="mt-2 text-sm leading-relaxed text-body">{parts.slice(2).join(" | ")}</p> : null}
              </li>
            ))}
          </ul>
        </InfoSection>
      ) : null}

      <InfoSection className="pt-0 md:pt-0">
        <Callout
          accent="slate"
          title={say(locale, "Is your own application delayed?", "هل طلبك أنت متأخر؟")}
          action={
            <Link href={href("/account", locale)} className={infoSecondary}>
              {say(locale, "Open my account", "افتح حسابي")}
            </Link>
          }
        >
          <p>{say(locale, "Your account shows the latest status from our team and the target date for each application.", "يعرض حسابك آخر حالة من الفريق والموعد المستهدف لكل طلب.")}</p>
        </Callout>
      </InfoSection>
      <TrustNav locale={locale} current="/transparency/status" />
    </>
  );
}

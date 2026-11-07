"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Plus, RotateCcw, Search, X } from "lucide-react";
import type { ApplicationGapCount } from "@/lib/account";
import { isClosedStatus } from "@/lib/account-insights";
import { href, visaHref } from "@/lib/href";
import { t } from "@/lib/i18n";
import type { Application } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/visa";
import { CopyText, EmptyState, StageTrack, StatusPill, cardClass, inputClass, primaryButton, quietButton, relativeTime, say, secondaryButton } from "@/components/account/ui";
import { destinationName, matchesFilter, needsAction, normalize, orderFilters, type OrderFilter } from "./model";
import { AppIdentity, GapBadges, timingFact } from "./parts";

function filterLabel(locale: string, filter: OrderFilter) {
  switch (filter) {
    case "action":
      return say(locale, "Needs action", "تحتاج إجراءً");
    case "open":
      return say(locale, "In progress", "جارية");
    case "approved":
      return t(locale, "account.filterDone");
    case "closed":
      return t(locale, "account.filterClosed");
    default:
      return t(locale, "account.filterAll");
  }
}

function primaryAction(app: Application, locale: string, gap: ApplicationGapCount | undefined, hasVisa: boolean) {
  const details = (hash: string) => href(`/account/applications/${app.id}${hash}`, locale);
  if (app.status === "payment_pending") return { label: say(locale, "Complete payment", "إتمام الدفع"), to: href(`/apply/${app.id}`, locale) };
  if (app.status === "draft") return { label: say(locale, "Finish application", "إكمال الطلب"), to: href(`/apply/${app.id}`, locale) };
  if (!isClosedStatus(app.status) && gap?.rejected) {
    return { label: gap.rejected === 1 ? say(locale, "Replace document", "استبدال المستند") : say(locale, "Replace documents", "استبدال المستندات"), to: details("#documents") };
  }
  if (!isClosedStatus(app.status) && gap?.missing) return { label: say(locale, "Review documents", "مراجعة المستندات"), to: details("#documents") };
  if (app.status === "approved" && hasVisa) return { label: say(locale, "Download visa", "تنزيل التأشيرة"), to: details("#visa") };
  return null;
}

export function Orders({
  locale,
  now,
  apps,
  gaps,
  visaApps,
  filter,
  query,
  onFilter,
  onQuery,
}: {
  locale: string;
  now: number;
  apps: Application[];
  gaps: Map<string, ApplicationGapCount>;
  visaApps: Set<string>;
  filter: OrderFilter;
  query: string;
  onFilter: (filter: OrderFilter) => void;
  onQuery: (query: string) => void;
}) {
  const ranked = useMemo(
    () =>
      [...apps].sort((a, b) => Number(needsAction(b, gaps.get(b.id))) - Number(needsAction(a, gaps.get(a.id))) || b.updatedAt.localeCompare(a.updatedAt)),
    [apps, gaps],
  );
  const needle = normalize(query);
  const searched = needle
    ? ranked.filter((app) =>
        normalize([app.destinationName, destinationName(app, "ar"), app.reference, app.visaLabel ?? "", app.visaLabelAr ?? ""].join(" ")).includes(needle),
      )
    : ranked;
  const shown = searched.filter((app) => matchesFilter(app, filter, gaps.get(app.id)));
  const date = new Date(now);

  if (apps.length === 0) {
    return (
      <EmptyState
        title={say(locale, "No applications yet", "لا توجد طلبات بعد")}
        body={say(locale, "Pick a destination to start. Your applications and their progress will appear here.", "اختر وجهة للبدء، وستظهر طلباتك ومراحلها هنا.")}
        action={
          <Link href={href("/", locale)} className={primaryButton}>
            <Plus aria-hidden className="size-4" />
            {say(locale, "New visa application", "طلب تأشيرة جديد")}
          </Link>
        }
      />
    );
  }

  return (
    <div className="min-w-0">
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-ink" />
        <input
          type="search"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder={say(locale, "Search by destination or reference", "ابحث بالوجهة أو رقم الطلب")}
          aria-label={say(locale, "Search applications", "البحث في الطلبات")}
          className={cn(inputClass, "rounded-full ps-10 pe-10 [&::-webkit-search-cancel-button]:hidden")}
        />
        {query ? (
          <button
            type="button"
            onClick={() => onQuery("")}
            aria-label={say(locale, "Clear search", "مسح البحث")}
            className="absolute end-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-ink hover:bg-surface"
          >
            <X aria-hidden className="size-4" />
          </button>
        ) : null}
      </div>
      <div className="-mx-4 mt-3 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
        <div className="flex w-max gap-2" role="group" aria-label={say(locale, "Filter applications", "تصفية الطلبات")}>
          {orderFilters.map((id) => {
            const count = searched.filter((app) => matchesFilter(app, id, gaps.get(app.id))).length;
            const on = filter === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={on}
                onClick={() => onFilter(id)}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors",
                  on ? "bg-[#16182b] text-white" : "bg-white text-body ring-1 ring-[#e3e5f2] hover:ring-brand-200",
                )}
              >
                {filterLabel(locale, id)}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[11px] tabular-nums",
                    on ? "bg-white/15 text-white" : id === "action" && count ? "bg-amber-100 text-amber-800" : "bg-surface text-muted-ink",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {shown.length === 0 ? (
        <EmptyState
          className="mt-4"
          title={say(locale, "No matching applications", "لا توجد طلبات مطابقة")}
          body={say(locale, "Try another search or filter.", "جرّب كلمة بحث أو فلتراً آخر.")}
          action={
            <button
              type="button"
              onClick={() => {
                onQuery("");
                onFilter("all");
              }}
              className={secondaryButton}
            >
              <RotateCcw aria-hidden className="size-4" />
              {say(locale, "Show all applications", "عرض كل الطلبات")}
            </button>
          }
        />
      ) : (
        <ul className="mt-4 grid gap-3">
          {shown.map((app) => (
            <li key={app.id}>
              <OrderCard app={app} locale={locale} date={date} now={now} gap={gaps.get(app.id)} hasVisa={visaApps.has(app.id)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OrderCard({
  app,
  locale,
  date,
  now,
  gap,
  hasVisa,
}: {
  app: Application;
  locale: string;
  date: Date;
  now: number;
  gap?: ApplicationGapCount;
  hasVisa: boolean;
}) {
  const fact = timingFact(app, locale, date);
  const action = primaryAction(app, locale, gap, hasVisa);
  const closed = isClosedStatus(app.status);
  const urgent = needsAction(app, gap);
  return (
    <article className={cn(cardClass, "p-4 sm:p-5", urgent && "border-amber-200 shadow-[0_1px_0_0_rgba(245,158,11,0.15)]")}>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <AppIdentity app={app} locale={locale} />
        <StatusPill status={app.status} locale={locale} />
      </div>
      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-ink">
        <CopyText value={app.reference} locale={locale} />
        <span>
          {say(locale, "Updated", "آخر تحديث")} {relativeTime(locale, app.updatedAt, now)}
        </span>
      </div>
      <StageTrack status={app.status} locale={locale} className="mt-4" />
      <dl className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-surface p-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="col-span-2 min-w-0 sm:col-span-1">
          <dt className="text-[11px] text-muted-ink">{fact.label}</dt>
          <dd className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 text-sm">
            <span className={cn("font-semibold", fact.muted ? "font-medium text-muted-ink" : "text-[#16182b]")}>{fact.value}</span>
            {fact.note ? <span className={cn("text-xs", fact.late ? "font-semibold text-rose-600" : "text-brand-700")}>{fact.note}</span> : null}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[11px] text-muted-ink">{t(locale, "account.travelers")}</dt>
          <dd className="mt-0.5 text-sm font-semibold text-[#16182b] tabular-nums">{app.travelerCount}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[11px] text-muted-ink">{t(locale, "account.total")}</dt>
          <dd className="mt-0.5 truncate text-sm font-semibold text-[#16182b]">{formatMoney(app.totalAmount, app.currency, locale)}</dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap-reverse items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {action ? (
            <Link href={action.to} className={primaryButton}>
              {action.label}
            </Link>
          ) : null}
          <Link href={href(`/account/applications/${app.id}`, locale)} className={secondaryButton}>
            {closed ? say(locale, "View details", "عرض التفاصيل") : action ? say(locale, "Details", "التفاصيل") : say(locale, "Track application", "تتبّع الطلب")}
          </Link>
          {closed ? (
            <Link href={visaHref(app.destinationSlug, locale)} className={cn(quietButton, "h-10")}>
              <RotateCcw aria-hidden className="size-3.5" />
              {t(locale, "account.reapply")}
            </Link>
          ) : null}
        </div>
        <GapBadges gap={closed ? undefined : gap} locale={locale} />
      </div>
    </article>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import { Bell, Check, Copy, Gift, Plus, Share2 } from "lucide-react";
import { markNotificationsRead } from "@/app/actions/account";
import type { AccountNotification, IssuedVisaRow, UserFileRow } from "@/lib/account";
import { isClosedStatus, isUnpaidStatus, type AccountTask, type PassportHealth } from "@/lib/account-insights";
import { href } from "@/lib/href";
import { t } from "@/lib/i18n";
import type { Application } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Card, EmptyState, SectionTitle, StageTrack, StatusPill, primaryButton, quietButton, relativeTime, say, secondaryButton } from "@/components/account/ui";
import type { OrderFilter, Tab } from "./model";
import { AppIdentity, CountBadge, timingFact } from "./parts";
import { TaskList } from "./tasks";

export function Overview({
  locale,
  now,
  apps,
  visas,
  documents,
  tasks,
  passport,
  profilePercent,
  notifications,
  referralUrl,
  onPick,
}: {
  locale: string;
  now: number;
  apps: Application[];
  visas: IssuedVisaRow[];
  documents: UserFileRow[];
  tasks: AccountTask[];
  passport: PassportHealth;
  profilePercent: number;
  notifications: AccountNotification[];
  referralUrl: string;
  onPick: (tab: Tab, filter?: OrderFilter) => void;
}) {
  const byId = new Map(apps.map((app) => [app.id, app]));
  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
      <div className="grid min-w-0 content-start gap-4">
        <TaskList locale={locale} tasks={tasks} apps={byId} visas={visas} documents={documents} passport={passport} profilePercent={profilePercent} />
        <ActiveApps locale={locale} now={now} apps={apps} onPick={onPick} />
      </div>
      <div className="grid min-w-0 content-start gap-4">
        <Notifications locale={locale} now={now} notifications={notifications} />
        {referralUrl ? <InviteCard locale={locale} url={referralUrl} /> : null}
      </div>
    </div>
  );
}

function activeRank(app: Application) {
  if (isUnpaidStatus(app.status)) return app.status === "payment_pending" ? 1 : 2;
  return 0;
}

function ActiveApps({ locale, now, apps, onPick }: { locale: string; now: number; apps: Application[]; onPick: (tab: Tab, filter?: OrderFilter) => void }) {
  const open = apps
    .filter((app) => !isClosedStatus(app.status))
    .sort((a, b) => activeRank(a) - activeRank(b) || b.updatedAt.localeCompare(a.updatedAt));
  const date = new Date(now);
  if (apps.length === 0) {
    return (
      <EmptyState
        title={say(locale, "Start your first visa application", "ابدأ أول طلب تأشيرة")}
        body={say(locale, "Pick a destination and we will guide you step by step.", "اختر وجهتك وسنرشدك خطوة بخطوة حتى صدور التأشيرة.")}
        action={
          <Link href={href("/", locale)} className={primaryButton}>
            <Plus aria-hidden className="size-4" />
            {say(locale, "Browse destinations", "تصفّح الوجهات")}
          </Link>
        }
      />
    );
  }
  return (
    <Card>
      <SectionTitle
        title={say(locale, "Active applications", "طلبات جارية")}
        action={
          <button type="button" onClick={() => onPick("orders", open.length ? "open" : "all")} className={quietButton}>
            {say(locale, `All applications (${apps.length})`, `كل الطلبات (${apps.length})`)}
          </button>
        }
      />
      {open.length === 0 ? (
        <p className="mt-3 text-sm text-muted-ink">{say(locale, "No applications in progress right now.", "لا توجد طلبات قيد التنفيذ حالياً.")}</p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {open.slice(0, 3).map((app) => {
            const fact = timingFact(app, locale, date);
            return (
              <li key={app.id}>
                <Link
                  href={href(`/account/applications/${app.id}`, locale)}
                  className="block min-w-0 rounded-2xl border border-[#eceef6] p-4 transition-colors hover:border-brand-200 hover:bg-brand-50/30"
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <AppIdentity app={app} locale={locale} size="sm" />
                    <StatusPill status={app.status} locale={locale} />
                  </div>
                  <StageTrack status={app.status} locale={locale} className="mt-4" />
                  <p className="mt-3 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-ink">
                    <span>{fact.label}:</span>
                    <span className={cn("font-medium", fact.muted ? "text-muted-ink" : "text-[#16182b]")}>{fact.value}</span>
                    {fact.note ? <span className={cn(fact.late ? "font-semibold text-rose-600" : "text-brand-700")}>· {fact.note}</span> : null}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

const NOTICES = 5;

function Notifications({ locale, now, notifications }: { locale: string; now: number; notifications: AccountNotification[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [cleared, setCleared] = useState(false);
  const [all, setAll] = useState(false);
  const isUnread = (item: AccountNotification) => !item.readAt && !cleared;
  const unread = notifications.filter(isUnread).length;
  const shown = all ? notifications : notifications.slice(0, NOTICES);

  function markAll() {
    setCleared(true);
    start(async () => {
      await markNotificationsRead(locale);
      router.refresh();
    });
  }

  return (
    <Card className="p-0">
      <div className="flex min-w-0 items-center justify-between gap-3 px-5 pt-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-[#16182b]">
          {t(locale, "account.notifications")}
          {unread ? <CountBadge value={unread} tone="amber" /> : null}
        </h2>
        {unread ? (
          <button type="button" disabled={pending} onClick={markAll} className={cn(quietButton, "-me-2")}>
            <Check aria-hidden className="size-3.5" />
            {say(locale, "Mark all as read", "تحديد الكل كمقروء")}
          </button>
        ) : null}
      </div>
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center px-5 py-8 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-surface text-muted-ink">
            <Bell aria-hidden className="size-5" />
          </span>
          <p className="mt-2 text-sm text-muted-ink">{t(locale, "account.noNotifications")}</p>
        </div>
      ) : (
        <ul className="mt-3 px-2 pb-2">
          {shown.map((item) => {
            const body = (
              <>
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", isUnread(item) ? "bg-brand" : "bg-transparent")} />
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm leading-snug", isUnread(item) ? "font-semibold text-[#16182b]" : "font-medium text-body")}>
                    <bdi>{item.title}</bdi>
                  </span>
                  {item.body ? (
                    <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-muted-ink">
                      <bdi>{item.body}</bdi>
                    </span>
                  ) : null}
                  <span className="mt-1 flex flex-wrap gap-x-2 text-[11px] text-muted-ink">
                    <span>{relativeTime(locale, item.createdAt, now)}</span>
                    {item.applicationId ? <span className="font-medium text-brand-700">{say(locale, "View application", "عرض الطلب")}</span> : null}
                  </span>
                </span>
              </>
            );
            const rowClass = cn("flex min-w-0 gap-2.5 rounded-xl px-3 py-2.5", isUnread(item) && "bg-brand-50/60");
            return (
              <li key={item.id}>
                {item.applicationId ? (
                  <Link href={href(`/account/applications/${item.applicationId}`, locale)} className={cn(rowClass, "transition-colors hover:bg-surface")}>
                    {body}
                  </Link>
                ) : (
                  <div className={rowClass}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {notifications.length > NOTICES ? (
        <div className="border-t border-[#eef0f7] px-3 py-2">
          <button type="button" onClick={() => setAll((value) => !value)} className={quietButton}>
            {all ? say(locale, "Show less", "عرض أقل") : say(locale, `Show all (${notifications.length})`, `عرض الكل (${notifications.length})`)}
          </button>
        </div>
      ) : null}
    </Card>
  );
}

const noSubscribe = () => () => {};

function InviteCard({ locale, url }: { locale: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const canShare = useSyncExternalStore(
    noSubscribe,
    () => typeof navigator.share === "function",
    () => false,
  );
  const message = say(locale, "Start your visa application with my link:", "ابدأ طلب تأشيرتك من خلال رابطي:");

  function copy() {
    void navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <Card className="bg-gradient-to-br from-brand-50 via-white to-white">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#16182b] text-[#ffd873]">
          <Gift aria-hidden className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-[#16182b]">{say(locale, "Invite a friend", "ادعُ صديقاً")}</h2>
          <p className="mt-0.5 text-sm leading-relaxed text-muted-ink">
            {say(locale, "Share your personal link with friends who are planning a trip.", "شارك رابطك الخاص مع أصدقائك الذين يخططون للسفر.")}
          </p>
        </div>
      </div>
      <p dir="ltr" className="mt-4 truncate rounded-xl bg-white px-3 py-2.5 text-start font-mono text-xs text-body ring-1 ring-[#e3e5f2]" title={url}>
        {url.replace(/^https?:\/\//, "")}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={copy} className={cn(primaryButton, "h-9 flex-1")} aria-live="polite">
          {copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
          {copied ? say(locale, "Link copied", "تم نسخ الرابط") : say(locale, "Copy link", "نسخ الرابط")}
        </button>
        {canShare ? (
          <button
            type="button"
            onClick={() => void navigator.share({ text: message, url }).catch(() => {})}
            className={cn(secondaryButton, "h-9 flex-1")}
          >
            <Share2 aria-hidden className="size-4" />
            {say(locale, "Share", "مشاركة")}
          </button>
        ) : null}
      </div>
    </Card>
  );
}

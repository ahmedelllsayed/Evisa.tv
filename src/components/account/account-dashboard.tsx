"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { markNotificationsRead } from "@/app/actions/account";
import type { AccountNotification, AccountProfileSummary, AccountStats, IssuedVisaRow, UserFileRow, UserPaymentRow } from "@/lib/account";
import { href, visaHref } from "@/lib/href";
import { t, tf, type MessageKey } from "@/lib/i18n";
import { docLabel } from "@/lib/localize";
import type { ProfileDocument } from "@/lib/profile";
import type { Application, ApplicationStatus } from "@/lib/types";
import { formatAt, formatMoney } from "@/lib/visa";
import { cn } from "@/lib/utils";

const tabs = ["overview", "orders", "visas", "files", "payments", "profile"] as const;
type Tab = (typeof tabs)[number];

const tabKeys: Record<Tab, MessageKey> = {
  overview: "account.tabOverview",
  orders: "account.tabOrders",
  visas: "account.tabVisas",
  files: "account.tabFiles",
  payments: "account.tabPayments",
  profile: "account.tabProfile",
};

const statusKeys: Record<ApplicationStatus, MessageKey> = {
  draft: "status.draft",
  payment_pending: "status.payment_pending",
  submitted: "status.submitted",
  in_review: "status.in_review",
  filed: "status.filed",
  approved: "status.approved",
  rejected: "status.rejected",
  cancelled: "status.cancelled",
  refunded: "status.refunded",
};

const payKeys: Record<UserPaymentRow["status"], MessageKey> = {
  pending: "account.payPending",
  paid: "account.payPaid",
  failed: "account.payFailed",
  refunded: "account.payRefunded",
};

const docStatusKeys: Record<UserFileRow["status"], MessageKey> = {
  uploaded: "account.docUploaded",
  verified: "account.docVerified",
  rejected: "account.docRejected",
};

const flow: ApplicationStatus[] = ["draft", "payment_pending", "submitted", "in_review", "filed", "approved"];
const openStatuses = new Set<ApplicationStatus>(["draft", "payment_pending", "submitted", "in_review", "filed"]);
const closedStatuses = new Set<ApplicationStatus>(["rejected", "cancelled", "refunded"]);

function statusLabel(locale: string, status: string) {
  const key = statusKeys[status as ApplicationStatus];
  return key ? t(locale, key) : status;
}

function fileHref(storagePath: string) {
  return `/api/files/${storagePath.split("/").map((part) => encodeURIComponent(part)).join("/")}`;
}

function passportState(expiry: string) {
  if (!expiry) return null;
  const end = new Date(`${expiry}T00:00:00`);
  if (Number.isNaN(end.getTime())) return null;
  const days = (end.getTime() - Date.now()) / 86_400_000;
  if (days < 0) return "expired" as const;
  if (days < 180) return "soon" as const;
  return null;
}

function canReapply(status: ApplicationStatus) {
  return status === "approved" || closedStatuses.has(status);
}

export function AccountDashboard({
  locale,
  email,
  initialTab,
  apps,
  visas,
  documents,
  profileDocuments,
  payments,
  refunds,
  notifications,
  stats,
  profile,
}: {
  locale: string;
  email: string;
  initialTab: string;
  apps: Application[];
  visas: IssuedVisaRow[];
  documents: UserFileRow[];
  profileDocuments: ProfileDocument[];
  payments: UserPaymentRow[];
  refunds: { applicationId: string; status: "open" | "approved" | "declined" }[];
  notifications: AccountNotification[];
  stats: AccountStats;
  profile: AccountProfileSummary;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(tabs.includes(initialTab as Tab) ? (initialTab as Tab) : "overview");
  const [pending, start] = useTransition();
  const unread = notifications.filter((item) => !item.readAt).length;

  function choose(next: Tab) {
    setTab(next);
    const url = href(`/account?tab=${next}`, locale);
    window.history.replaceState(null, "", url);
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl px-4 py-8">
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold">{t(locale, "account.title")}</h1>
          <p className="mt-1 truncate text-sm text-muted-ink">{email}</p>
        </div>
      </div>
      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => choose(id)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-sm",
              tab === id ? "bg-brand text-white" : "border border-line bg-white text-ink",
            )}
          >
            {t(locale, tabKeys[id])}
            {id === "overview" && unread > 0 ? ` (${unread})` : ""}
          </button>
        ))}
      </div>
      <div className="mt-6 min-w-0">
        {tab === "overview" && (
          <Overview
            locale={locale}
            apps={apps}
            visas={visas}
            documents={documents}
            notifications={notifications}
            stats={stats}
            profile={profile}
            pending={pending}
            onRead={() =>
              start(async () => {
                await markNotificationsRead(locale);
                router.refresh();
              })
            }
            onTab={choose}
          />
        )}
        {tab === "orders" && <Orders locale={locale} apps={apps} />}
        {tab === "visas" && <Visas locale={locale} visas={visas} />}
        {tab === "files" && <Files locale={locale} documents={documents} profileDocuments={profileDocuments} />}
        {tab === "payments" && <Payments locale={locale} payments={payments} refunds={refunds} />}
        {tab === "profile" && <Details locale={locale} profile={profile} profileDocuments={profileDocuments} />}
      </div>
    </div>
  );
}

function Overview({
  locale,
  apps,
  visas,
  documents,
  notifications,
  stats,
  profile,
  pending,
  onRead,
  onTab,
}: {
  locale: string;
  apps: Application[];
  visas: IssuedVisaRow[];
  documents: UserFileRow[];
  notifications: AccountNotification[];
  stats: AccountStats;
  profile: AccountProfileSummary;
  pending: boolean;
  onRead: () => void;
  onTab: (tab: Tab) => void;
}) {
  const next = nextStep(locale, apps, visas, documents);
  const passport = passportState(profile.passportExpiry);
  const cards = [
    [stats.open, "account.open", "orders"],
    [stats.done, "account.done", "orders"],
    [stats.gaps, "account.gaps", "files"],
    [stats.visas, "account.visas", "visas"],
  ] as const;
  return (
    <div className="grid min-w-0 gap-4">
      {passport && (
        <p className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {t(locale, passport === "expired" ? "account.passportExpired" : "account.passportSoon")}
        </p>
      )}
      {next && (
        <div className="min-w-0 rounded-2xl border border-line bg-white p-4">
          <p className="text-xs font-medium tracking-wide text-muted-ink uppercase">{t(locale, "account.next")}</p>
          <p className="mt-2 text-sm">{next.text}</p>
          <Link href={next.href} className="mt-3 inline-flex rounded-full bg-brand px-4 py-2 text-sm text-white">
            {next.action}
          </Link>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map(([value, key, target]) => (
          <button key={key} type="button" onClick={() => onTab(target)} className="min-w-0 rounded-2xl border border-line bg-white p-4 text-start">
            <p className="font-display text-2xl font-semibold">{value}</p>
            <p className="mt-1 text-xs text-muted-ink">{t(locale, key)}</p>
          </button>
        ))}
      </div>
      <section className="min-w-0 rounded-2xl border border-line bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">{t(locale, "account.notifications")}</h2>
          {notifications.some((item) => !item.readAt) && (
            <button type="button" disabled={pending} onClick={onRead} className="text-xs text-brand">
              {t(locale, "account.markRead")}
            </button>
          )}
        </div>
        {notifications.length === 0 ? (
          <p className="mt-3 text-sm text-muted-ink">{t(locale, "account.noNotifications")}</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {notifications.slice(0, 6).map((item) => (
              <li key={item.id} className="min-w-0">
                {item.applicationId ? (
                  <Link href={href(`/account/applications/${item.applicationId}`, locale)} className="block min-w-0">
                    <Notice item={item} />
                  </Link>
                ) : (
                  <Notice item={item} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Notice({ item }: { item: AccountNotification }) {
  return (
    <div className={cn("min-w-0", !item.readAt && "border-s-2 border-brand ps-3")}>
      <p className="text-sm font-medium">{item.title}</p>
      {item.body && <p className="text-sm text-body">{item.body}</p>}
      <p className="text-xs text-muted-ink">{formatAt(item.createdAt)}</p>
    </div>
  );
}

function nextStep(locale: string, apps: Application[], visas: IssuedVisaRow[], documents: UserFileRow[]) {
  const pay = apps.find((app) => app.status === "payment_pending");
  if (pay) {
    return {
      href: href(`/apply/${pay.id}`, locale),
      text: tf(locale, "account.nextPay", { name: pay.destinationName }),
      action: t(locale, "account.continue"),
    };
  }
  const rejected = documents.find((doc) => doc.status === "rejected");
  if (rejected) {
    return {
      href: href(`/account/applications/${rejected.applicationId}`, locale),
      text: tf(locale, "account.nextDocs", { ref: rejected.reference }),
      action: t(locale, "account.track"),
    };
  }
  const recentVisa = visas.find((visa) => Date.now() - new Date(visa.createdAt).getTime() < 30 * 86_400_000);
  if (recentVisa) {
    return {
      href: href(`/account/applications/${recentVisa.applicationId}`, locale),
      text: tf(locale, "account.nextVisa", { name: recentVisa.destinationName }),
      action: t(locale, "account.download"),
    };
  }
  const draft = apps.find((app) => app.status === "draft");
  if (draft) {
    return {
      href: href(`/apply/${draft.id}`, locale),
      text: tf(locale, "account.nextDraft", { name: draft.destinationName }),
      action: t(locale, "account.continue"),
    };
  }
  return null;
}

function Orders({ locale, apps }: { locale: string; apps: Application[] }) {
  const [filter, setFilter] = useState<"all" | "open" | "done" | "closed">("all");
  const filters = [
    ["all", "account.filterAll"],
    ["open", "account.filterOpen"],
    ["done", "account.filterDone"],
    ["closed", "account.filterClosed"],
  ] as const;
  const ranked = [...apps].sort((a, b) => rank(a.status) - rank(b.status));
  const shown = ranked.filter((app) => {
    if (filter === "open") return openStatuses.has(app.status);
    if (filter === "done") return app.status === "approved";
    if (filter === "closed") return closedStatuses.has(app.status);
    return true;
  });
  return (
    <div className="min-w-0">
      <div className="flex gap-2 overflow-x-auto">
        {filters.map(([id, key]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={cn("shrink-0 rounded-full px-3 py-1 text-xs", filter === id ? "bg-ink text-white" : "bg-surface text-body")}
          >
            {t(locale, key)}
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {shown.length === 0 && <p className="text-sm text-muted-ink">{t(locale, "account.empty")}</p>}
        {shown.map((app) => (
          <article key={app.id} className="min-w-0 rounded-2xl border border-line bg-white p-4">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                {app.destinationFlag && (
                  <img src={app.destinationFlag} alt="" className="size-8 shrink-0 rounded-full object-cover" />
                )}
                <div className="min-w-0">
                  <p className="truncate font-medium">{app.destinationName}</p>
                  <p className="text-xs text-muted-ink">{app.reference}</p>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
                {statusLabel(locale, app.status)}
              </span>
            </div>
            <Progress status={app.status} />
            <p className="mt-3 text-xs text-muted-ink">
              {app.guaranteedAt ? `${t(locale, "account.guaranteed")} ${formatAt(app.guaranteedAt, locale)}` : formatAt(app.updatedAt, locale)}
              {` · ${t(locale, "account.travelers")} ${app.travelerCount}`}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={href(`/account/applications/${app.id}`, locale)} className="rounded-full bg-brand px-3 py-1.5 text-xs text-white">
                {t(locale, "account.track")}
              </Link>
              {(app.status === "draft" || app.status === "payment_pending") && (
                <Link href={href(`/apply/${app.id}`, locale)} className="rounded-full border border-line px-3 py-1.5 text-xs">
                  {t(locale, "account.continue")}
                </Link>
              )}
              {canReapply(app.status) && (
                <Link href={visaHref(app.destinationSlug, locale)} className="rounded-full border border-line px-3 py-1.5 text-xs">
                  {t(locale, "account.reapply")}
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function rank(status: ApplicationStatus) {
  if (status === "payment_pending") return 0;
  if (status === "draft") return 1;
  return 2;
}

function Progress({ status }: { status: ApplicationStatus }) {
  const index = flow.indexOf(status);
  return (
    <div className="mt-3 flex gap-1">
      {flow.map((step, i) => (
        <span key={step} className={cn("h-1 flex-1 rounded-full", index >= i ? "bg-brand" : "bg-surface")} />
      ))}
    </div>
  );
}

function Visas({ locale, visas }: { locale: string; visas: IssuedVisaRow[] }) {
  const groups = new Map<string, IssuedVisaRow[]>();
  for (const visa of visas) {
    const list = groups.get(visa.applicationId) ?? [];
    list.push(visa);
    groups.set(visa.applicationId, list);
  }
  if (!visas.length) return <p className="text-sm text-muted-ink">{t(locale, "account.noVisas")}</p>;
  return (
    <div className="space-y-4">
      {[...groups.values()].map((group) => {
        const first = group[0];
        return (
          <section key={first.applicationId} className="min-w-0 rounded-2xl border border-line bg-white p-4">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{first.destinationName}</p>
                <p className="text-xs text-muted-ink">{first.reference}</p>
              </div>
              <a href={`/api/account/visas/${first.applicationId}/zip`} className="rounded-full bg-brand px-3 py-1.5 text-xs text-white">
                {t(locale, "account.downloadAll")}
              </a>
            </div>
            <ul className="mt-3 space-y-2">
              {group.map((file) => (
                <li key={file.id} className="flex min-w-0 items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{file.fileName}</span>
                  <a href={fileHref(file.storagePath)} className="shrink-0 text-xs text-brand" target="_blank" rel="noreferrer">
                    {t(locale, "account.download")}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function Files({
  locale,
  documents,
  profileDocuments,
}: {
  locale: string;
  documents: UserFileRow[];
  profileDocuments: ProfileDocument[];
}) {
  const groups = new Map<string, UserFileRow[]>();
  for (const doc of documents) {
    const list = groups.get(doc.applicationId) ?? [];
    list.push(doc);
    groups.set(doc.applicationId, list);
  }
  return (
    <div className="space-y-4">
      {profileDocuments.length > 0 && (
        <section className="min-w-0 rounded-2xl border border-line bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">{t(locale, "account.profileDocs")}</h2>
            <Link href={href("/account/profile", locale)} className="text-xs text-brand">
              {t(locale, "account.editProfile")}
            </Link>
          </div>
          <ul className="mt-3 space-y-2">
            {profileDocuments.map((doc) => (
              <li key={doc.id} className="flex min-w-0 items-center justify-between gap-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{docLabel(doc.kind, locale)}</span>
                  <span className="block truncate text-xs text-muted-ink">{doc.fileName}</span>
                </span>
                <a href={fileHref(doc.storagePath)} className="shrink-0 text-xs text-brand" target="_blank" rel="noreferrer">
                  {t(locale, "common.view")}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      {documents.length === 0 && <p className="text-sm text-muted-ink">{t(locale, "account.noFiles")}</p>}
      {[...groups.values()].map((group) => (
        <section key={group[0].applicationId} className="min-w-0 rounded-2xl border border-line bg-white p-4">
          <p className="font-medium">{group[0].destinationName}</p>
          <p className="text-xs text-muted-ink">{group[0].reference}</p>
          <ul className="mt-3 space-y-2">
            {group.map((doc) => (
              <li key={doc.id} className="min-w-0 rounded-xl bg-surface px-3 py-2 text-sm">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <span className="min-w-0 truncate">{docLabel(doc.kind, locale)} · {doc.fileName}</span>
                  <span className={cn("shrink-0 text-xs", doc.status === "rejected" ? "text-red-600" : "text-muted-ink")}>
                    {t(locale, docStatusKeys[doc.status])}
                  </span>
                </div>
                {doc.travelerName && <p className="text-xs text-muted-ink">{doc.travelerName}</p>}
                {doc.status === "rejected" && doc.rejectReason && <p className="text-xs text-red-600">{doc.rejectReason}</p>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Payments({
  locale,
  payments,
  refunds,
}: {
  locale: string;
  payments: UserPaymentRow[];
  refunds: { applicationId: string; status: "open" | "approved" | "declined" }[];
}) {
  const refundByApp = new Map(refunds.map((refund) => [refund.applicationId, refund.status]));
  if (!payments.length) return <p className="text-sm text-muted-ink">{t(locale, "account.noPayments")}</p>;
  return (
    <ul className="space-y-3">
      {payments.map((payment) => {
        const refund = refundByApp.get(payment.applicationId);
        return (
          <li key={payment.id} className="min-w-0 rounded-2xl border border-line bg-white p-4 text-sm">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{payment.destinationName}</p>
                <p className="text-xs text-muted-ink">{payment.reference}</p>
              </div>
              <span className="shrink-0 text-xs font-medium">{t(locale, payKeys[payment.status])}</span>
            </div>
            <p className="mt-2">{formatMoney(payment.amount, payment.currency)}</p>
            <p className="mt-1 text-xs text-muted-ink">
              {formatAt(payment.createdAt, locale)}
              {payment.merchantOrderId ? ` · ${t(locale, "account.paymentRef")} ${payment.merchantOrderId}` : ""}
            </p>
            {refund && (
              <p className="mt-1 text-xs text-body">
                {t(locale, refund === "declined" ? "account.refundDeclined" : "account.refundSent")}
              </p>
            )}
            <Link href={href(`/account/applications/${payment.applicationId}`, locale)} className="mt-2 inline-block text-xs text-brand">
              {t(locale, "account.track")}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Details({
  locale,
  profile,
  profileDocuments,
}: {
  locale: string;
  profile: AccountProfileSummary;
  profileDocuments: ProfileDocument[];
}) {
  const passport = passportState(profile.passportExpiry);
  const rows = [
    [t(locale, "apply.firstName"), `${profile.firstName} ${profile.lastName}`.trim()],
    [t(locale, "profile.phone"), profile.phone],
    [t(locale, "apply.nationality"), profile.nationality],
    [t(locale, "apply.passportNo"), profile.passportNumber],
    [t(locale, "apply.passportExp"), profile.passportExpiry],
  ];
  return (
    <div className="min-w-0 rounded-2xl border border-line bg-white p-4">
      {passport && (
        <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {t(locale, passport === "expired" ? "account.passportExpired" : "account.passportSoon")}
        </p>
      )}
      <dl className="grid gap-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs text-muted-ink">{label}</dt>
            <dd className="truncate text-sm font-medium">{value || "—"}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-sm text-muted-ink">
        {t(locale, "account.profileDocs")}: {profileDocuments.length}
      </p>
      <Link href={href("/account/profile", locale)} className="mt-4 inline-flex rounded-full bg-brand px-4 py-2 text-sm text-white">
        {t(locale, "account.editProfile")}
      </Link>
    </div>
  );
}

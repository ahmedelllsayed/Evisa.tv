"use client";

import { useMemo, useState } from "react";
import { Swap } from "@/components/motion/frame";
import type {
  AccountNotification,
  AccountProfileSummary,
  AccountStats,
  ApplicationGapCount,
  IssuedVisaRow,
  UserFileRow,
  UserPaymentRow,
} from "@/lib/account";
import { accountTasks, isClosedStatus, passportHealth, profileChecklist } from "@/lib/account-insights";
import { href } from "@/lib/href";
import type { ProfileDocument } from "@/lib/profile";
import type { Application } from "@/lib/types";
import { Details } from "./dashboard/details";
import { Files } from "./dashboard/files";
import { DashboardHeader } from "./dashboard/header";
import { isTab, needsAction, type OrderFilter, type Tab } from "./dashboard/model";
import { Orders } from "./dashboard/orders";
import { Overview } from "./dashboard/overview";
import { Payments } from "./dashboard/payments";
import { TabBar, panelId, tabId, type TabBadge } from "./dashboard/tab-bar";
import { Visas } from "./dashboard/visas";

export function AccountDashboard({
  locale,
  email,
  initialTab,
  now,
  apps,
  visas,
  documents,
  gaps,
  profileDocuments,
  payments,
  refunds,
  notifications,
  profile,
  referralUrl,
}: {
  locale: string;
  email: string;
  initialTab: string;
  now: number;
  apps: Application[];
  visas: IssuedVisaRow[];
  documents: UserFileRow[];
  gaps: ApplicationGapCount[];
  profileDocuments: ProfileDocument[];
  payments: UserPaymentRow[];
  refunds: { applicationId: string; status: "open" | "approved" | "declined" }[];
  notifications: AccountNotification[];
  stats: AccountStats;
  profile: AccountProfileSummary;
  referralUrl: string;
}) {
  const [tab, setTab] = useState<Tab>(isTab(initialTab) ? initialTab : "overview");
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [query, setQuery] = useState("");

  const derived = useMemo(() => {
    const date = new Date(now);
    const gapByApp = new Map(gaps.map((gap) => [gap.applicationId, gap]));
    const checklist = profileChecklist({ ...profile, documentKinds: profileDocuments.map((doc) => doc.kind) });
    const passport = passportHealth(profile.passportExpiry, { now: date });
    const tasks = accountTasks({ apps, gaps, visas, passport, profilePercent: checklist.percent, now: date });
    const visaApps = new Set(visas.map((visa) => visa.applicationId));
    return {
      gapByApp,
      checklist,
      passport,
      tasks,
      visaApps,
      open: apps.filter((app) => !isClosedStatus(app.status)).length,
      action: apps.filter((app) => needsAction(app, gapByApp.get(app.id))).length,
      rejected: documents.filter((doc) => doc.status === "rejected").length,
    };
  }, [now, gaps, profile, profileDocuments, apps, visas, documents]);

  function choose(next: Tab, nextFilter?: OrderFilter) {
    setTab(next);
    if (nextFilter) setFilter(nextFilter);
    window.history.replaceState(null, "", href(`/account?tab=${next}`, locale));
  }

  const missingProfile = derived.checklist.total - derived.checklist.done;
  const badges: Partial<Record<Tab, TabBadge>> = {
    overview: derived.tasks.length ? { value: derived.tasks.length, tone: "amber" } : undefined,
    orders: apps.length ? { value: apps.length } : undefined,
    visas: derived.visaApps.size ? { value: derived.visaApps.size } : undefined,
    files: derived.rejected
      ? { value: derived.rejected, tone: "red" }
      : documents.length + profileDocuments.length
        ? { value: documents.length + profileDocuments.length }
        : undefined,
    payments: payments.length ? { value: payments.length } : undefined,
    profile: missingProfile ? { value: missingProfile, tone: "amber" } : undefined,
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl px-4 py-6 sm:py-8">
      <DashboardHeader
        locale={locale}
        email={email}
        firstName={profile.firstName}
        percent={derived.checklist.percent}
        open={derived.open}
        action={derived.action}
        visas={derived.visaApps.size}
        onPick={choose}
      />
      <div className="mt-6">
        <TabBar locale={locale} active={tab} badges={badges} onSelect={(next) => choose(next)} />
      </div>
      <Swap id={tab} className="mt-5 min-w-0">
        <div role="tabpanel" id={panelId(tab)} aria-labelledby={tabId(tab)} className="min-w-0">
          {tab === "overview" && (
            <Overview
              locale={locale}
              now={now}
              apps={apps}
              visas={visas}
              documents={documents}
              tasks={derived.tasks}
              passport={derived.passport}
              profilePercent={derived.checklist.percent}
              notifications={notifications}
              referralUrl={referralUrl}
              onPick={choose}
            />
          )}
          {tab === "orders" && (
            <Orders
              locale={locale}
              now={now}
              apps={apps}
              gaps={derived.gapByApp}
              visaApps={derived.visaApps}
              filter={filter}
              query={query}
              onFilter={setFilter}
              onQuery={setQuery}
            />
          )}
          {tab === "visas" && <Visas locale={locale} visas={visas} apps={apps} onPick={choose} />}
          {tab === "files" && <Files locale={locale} apps={apps} documents={documents} profileDocuments={profileDocuments} gaps={derived.gapByApp} />}
          {tab === "payments" && <Payments locale={locale} apps={apps} payments={payments} refunds={refunds} />}
          {tab === "profile" && <Details locale={locale} profile={profile} passport={derived.passport} checklist={derived.checklist} />}
        </div>
      </Swap>
    </div>
  );
}

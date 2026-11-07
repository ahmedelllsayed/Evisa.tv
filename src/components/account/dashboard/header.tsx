"use client";

import Link from "next/link";
import { ChevronLeft, Plus } from "lucide-react";
import { href } from "@/lib/href";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Ring, say } from "@/components/account/ui";
import { displayName, type OrderFilter, type Tab } from "./model";

export function DashboardHeader({
  locale,
  email,
  firstName,
  percent,
  open,
  action,
  visas,
  onPick,
}: {
  locale: string;
  email: string;
  firstName: string;
  percent: number;
  open: number;
  action: number;
  visas: number;
  onPick: (tab: Tab, filter?: OrderFilter) => void;
}) {
  const name = displayName(firstName);
  const complete = percent >= 100;
  const stats = [
    { id: "open", value: open, label: say(locale, "In progress", "طلبات جارية"), pick: () => onPick("orders", "open") },
    { id: "action", value: action, label: say(locale, "Need your action", "تحتاج إجراءً منك"), alert: action > 0, pick: () => onPick("orders", "action") },
    { id: "visas", value: visas, label: say(locale, "Visas issued", "تأشيرات صادرة"), pick: () => onPick("visas") },
  ];
  return (
    <header className="relative overflow-hidden rounded-[26px] bg-[#16182b] p-5 text-white sm:p-7">
      <span aria-hidden className="pointer-events-none absolute -top-24 -end-16 size-64 rounded-full bg-brand/30 blur-3xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0">
          <p className="text-sm text-white/60">{t(locale, "account.title")}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {name ? say(locale, `Hi, ${name}`, `أهلاً، ${name}`) : say(locale, "Welcome back", "أهلاً بك")}
          </h1>
          <p className="mt-1.5 truncate text-sm text-white/60">
            <bdi>{email}</bdi>
          </p>
        </div>
        <Link
          href={href("/account/profile", locale)}
          className="group flex w-full min-w-0 items-center gap-3 rounded-2xl bg-white p-2.5 pe-4 text-[#16182b] transition-shadow hover:shadow-lg hover:shadow-black/20 sm:w-auto"
        >
          <Ring percent={percent} size={48} label={say(locale, `Profile ${percent}% complete`, `اكتمال الملف ${percent}%`)} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{complete ? say(locale, "Profile complete", "ملفك مكتمل") : say(locale, "Complete your profile", "أكمل ملفك")}</span>
            <span className="block text-xs text-muted-ink">
              {complete ? say(locale, "Reused on every application", "يُستخدم تلقائياً في طلباتك") : say(locale, "Apply faster next time", "لتقديم أسرع في المرة القادمة")}
            </span>
          </span>
          <ChevronLeft aria-hidden className="size-4 shrink-0 text-muted-ink transition-transform ltr:rotate-180 group-hover:-translate-x-0.5 ltr:group-hover:translate-x-0.5" />
        </Link>
      </div>
      <div className="relative mt-6 flex flex-wrap items-end justify-between gap-4">
        <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:gap-3">
          {stats.map((stat) => (
            <button
              key={stat.id}
              type="button"
              onClick={stat.pick}
              className="min-w-0 rounded-2xl bg-white/[0.06] px-3 py-3 text-start ring-1 ring-white/10 transition-colors hover:bg-white/[0.12] sm:min-w-32 sm:px-4"
            >
              <span className={cn("block text-2xl font-semibold tabular-nums", stat.alert ? "text-[#ffd873]" : "text-white")}>{stat.value}</span>
              <span className="mt-0.5 block text-xs leading-snug text-white/65">{stat.label}</span>
            </button>
          ))}
        </div>
        <Link
          href={href("/", locale)}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#ffd873] px-5 text-sm font-semibold text-[#16182b] transition-transform hover:-translate-y-0.5 sm:w-auto"
        >
          <Plus aria-hidden className="size-4" />
          {say(locale, "New visa application", "طلب تأشيرة جديد")}
        </Link>
      </div>
    </header>
  );
}

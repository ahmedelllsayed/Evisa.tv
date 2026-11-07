"use client";

import { motion } from "framer-motion";
import { useRef, type KeyboardEvent } from "react";
import { isArabicLocale, t, type MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { tabs, type Tab } from "./model";
import { CountBadge } from "./parts";

const tabKeys: Record<Tab, MessageKey> = {
  overview: "account.tabOverview",
  orders: "account.tabOrders",
  visas: "account.tabVisas",
  files: "account.tabFiles",
  payments: "account.tabPayments",
  profile: "account.tabProfile",
};

export type TabBadge = { value: number | string; tone?: "plain" | "amber" | "red" };

export const tabId = (tab: Tab) => `account-tab-${tab}`;
export const panelId = (tab: Tab) => `account-panel-${tab}`;

export function TabBar({
  locale,
  active,
  badges,
  onSelect,
}: {
  locale: string;
  active: Tab;
  badges: Partial<Record<Tab, TabBadge>>;
  onSelect: (tab: Tab) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function go(index: number) {
    const next = (index + tabs.length) % tabs.length;
    onSelect(tabs[next]);
    const button = refs.current[next];
    button?.focus();
    button?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const forward = isArabicLocale(locale) ? "ArrowLeft" : "ArrowRight";
    const back = isArabicLocale(locale) ? "ArrowRight" : "ArrowLeft";
    if (event.key === forward) go(index + 1);
    else if (event.key === back) go(index - 1);
    else if (event.key === "Home") go(0);
    else if (event.key === "End") go(tabs.length - 1);
    else return;
    event.preventDefault();
  }

  return (
    <div className="-mx-4 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
      <div role="tablist" aria-label={t(locale, "account.title")} className="flex w-max min-w-full gap-1 border-b border-[#e3e5f2]">
        {tabs.map((id, index) => {
          const on = id === active;
          const badge = badges[id];
          return (
            <button
              key={id}
              ref={(node) => {
                refs.current[index] = node;
              }}
              id={tabId(id)}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={panelId(id)}
              tabIndex={on ? 0 : -1}
              onClick={() => {
                onSelect(id);
                refs.current[index]?.scrollIntoView({ block: "nearest", inline: "nearest" });
              }}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                "relative flex shrink-0 items-center gap-1.5 rounded-t-lg px-3 py-3 text-sm font-medium whitespace-nowrap outline-none transition-colors focus-visible:bg-brand-50",
                on ? "text-brand-700" : "text-muted-ink hover:text-[#16182b]",
              )}
            >
              {t(locale, tabKeys[id])}
              {badge ? <CountBadge value={badge.value} tone={badge.tone} active={on} /> : null}
              {on ? <motion.span layoutId="account-tab" className="absolute inset-x-2 -bottom-px h-[3px] rounded-full bg-brand" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

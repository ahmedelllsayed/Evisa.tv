"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { ArrowUpRight, CheckCircle2, CircleSlash, MessageSquareText, Wallet } from "lucide-react";
import type { RefundStage } from "@/components/trust/refund-stages";
import { verdictTone, type RefundVerdict } from "@/components/trust/verdict";
import { cn } from "@/lib/utils";

export type PickerCopy = {
  stagesLabel: string;
  happens: string;
  why: string;
  inAccount: string;
  cta: string;
  ctaHref: string;
  verdicts: Record<RefundVerdict, { title: string; body: string }>;
};

const verdictIcon: Record<RefundVerdict, typeof CheckCircle2> = {
  yes: CheckCircle2,
  review: MessageSquareText,
  no: CircleSlash,
  none: Wallet,
  unknown: MessageSquareText,
};

export function RefundStagePicker({ stages, copy, initial = 0 }: { stages: RefundStage[]; copy: PickerCopy; initial?: number }) {
  const [active, setActive] = useState(Math.min(initial, Math.max(0, stages.length - 1)));
  const panelId = useId();
  const stage = stages[active];
  if (!stage) return null;
  const verdict = copy.verdicts[stage.verdict];
  const Icon = verdictIcon[stage.verdict];
  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      <div role="group" aria-label={copy.stagesLabel} className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {stages.map((item, index) => {
          const selected = index === active;
          return (
            <button
              key={`${item.stage}-${index}`}
              type="button"
              aria-pressed={selected}
              aria-controls={panelId}
              onClick={() => setActive(index)}
              className={cn(
                "flex min-w-0 items-center gap-3 rounded-[16px] border px-4 py-3 text-start transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                selected ? "border-[#16182b] bg-[#16182b] text-white" : "border-[#e3e5f2] bg-white text-[#16182b] hover:border-brand-200 hover:bg-brand-50/40",
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                  selected ? "bg-[#ffd873] text-black" : "bg-brand-50 text-brand-700",
                )}
              >
                {index + 1}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{item.stage}</span>
                {item.statuses.length ? (
                  <span className={cn("mt-0.5 block truncate text-xs", selected ? "text-white/65" : "text-muted-ink")}>{item.statuses.join(" · ")}</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      <div id={panelId} aria-live="polite" className="min-w-0 rounded-[22px] border border-[#e3e5f2] bg-white p-5 md:p-7">
        <div className={cn("flex min-w-0 items-start gap-3 rounded-[16px] px-4 py-3 ring-1 ring-inset", verdictTone[stage.verdict])}>
          <Icon aria-hidden className="mt-0.5 size-5 shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold">{verdict.title}</p>
            <p className="mt-0.5 text-sm leading-relaxed opacity-90">{stage.refund && stage.verdict === "unknown" ? stage.refund : verdict.body}</p>
          </div>
        </div>
        <h3 className="mt-5 text-xl font-semibold text-[#16182b]">{stage.stage}</h3>
        {stage.statuses.length ? (
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-ink">
            <span>{copy.inAccount}</span>
            {stage.statuses.map((status) => (
              <span key={status} className="rounded-full bg-[#f4f5fd] px-2.5 py-1 font-medium text-[#16182b]">
                {status}
              </span>
            ))}
          </p>
        ) : null}
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-xs font-semibold text-muted-ink">{copy.happens}</dt>
            <dd className="mt-1 text-sm leading-relaxed text-body">{stage.happens || "—"}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs font-semibold text-muted-ink">{copy.why}</dt>
            <dd className="mt-1 text-sm leading-relaxed text-body">{stage.reason || "—"}</dd>
          </div>
        </dl>
        <Link
          href={copy.ctaHref}
          className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
        >
          {copy.cta}
          <ArrowUpRight aria-hidden className="size-4 rtl:-scale-x-100" />
        </Link>
      </div>
    </div>
  );
}

import { Pill, type Tone } from "@/components/admin/chrome";
import { cn } from "@/lib/utils";
import type { Reason, Signals, Sla } from "./model";

const slaText: Record<Tone, string> = {
  neutral: "text-muted-foreground",
  info: "text-sky-300",
  success: "text-emerald-300",
  warning: "text-amber-200",
  danger: "text-rose-300",
};

const slaDot: Record<Tone, string> = {
  neutral: "bg-muted-foreground/60",
  info: "bg-sky-400",
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  danger: "bg-rose-500",
};

export function SlaText({ sla, className }: { sla: Sla; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium tabular-nums", slaText[sla.tone], className)}>
      <span className={cn("size-1.5 shrink-0 rounded-full", slaDot[sla.tone], sla.state === "late" && "animate-pulse")} />
      {sla.label}
    </span>
  );
}

const docParts = [
  { key: "verified", label: "معتمد", dot: "bg-emerald-400" },
  { key: "uploaded", label: "بانتظار المراجعة", dot: "bg-amber-400" },
  { key: "rejected", label: "مرفوض", dot: "bg-rose-500" },
  { key: "missing", label: "لم يُرفع", dot: "border border-muted-foreground/60" },
] as const;

export function DocCounts({ signals }: { signals: Signals }) {
  const total = signals.verified + signals.uploaded + signals.rejected + signals.missing;
  if (!total) return <span className="text-xs text-muted-foreground/70">—</span>;
  return (
    <span className="inline-flex items-center gap-2.5 font-mono text-xs tabular-nums" dir="ltr">
      {docParts.map((part) =>
        signals[part.key] ? (
          <span key={part.key} title={part.label} className="inline-flex items-center gap-1">
            <span className={cn("size-2 rounded-full", part.dot)} />
            {signals[part.key]}
          </span>
        ) : null,
      )}
    </span>
  );
}

export function DocLegend() {
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
      {docParts.map((part) => (
        <span key={part.key} className="inline-flex items-center gap-1.5">
          <span className={cn("size-2 rounded-full", part.dot)} />
          {part.label}
        </span>
      ))}
    </span>
  );
}

const reasonClass: Record<Tone, string> = {
  neutral: "border-border text-muted-foreground",
  info: "border-sky-400/30 text-sky-300",
  success: "border-emerald-500/30 text-emerald-300",
  warning: "border-amber-400/30 text-amber-200",
  danger: "border-rose-500/40 text-rose-300",
};

export function ReasonTags({ reasons, max = 3 }: { reasons: Reason[]; max?: number }) {
  if (!reasons.length) return null;
  const shown = reasons.slice(0, max);
  return (
    <span className="flex flex-wrap gap-1">
      {shown.map((reason) => (
        <span key={reason.label} className={cn("whitespace-nowrap rounded border px-1.5 py-px text-[11px] leading-4", reasonClass[reason.tone])}>
          {reason.label}
        </span>
      ))}
      {reasons.length > max ? <span className="px-1 text-[11px] text-muted-foreground">+{reasons.length - max}</span> : null}
    </span>
  );
}

export function Flag({ src, className }: { src: string | null; className?: string }) {
  if (!src) return <span className={cn("inline-block size-4 shrink-0 rounded-full bg-muted", className)} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className={cn("size-4 shrink-0 rounded-full object-cover ring-1 ring-white/10", className)} />;
}

export function PaidMark({ paid }: { paid: boolean }) {
  return paid ? (
    <Pill tone="success" dot>
      مدفوع
    </Pill>
  ) : (
    <Pill tone="neutral">غير مدفوع</Pill>
  );
}

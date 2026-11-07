import { Pill, type Tone } from "@/components/admin/chrome";
import { count } from "@/components/admin/format";
import { change, pct } from "@/components/admin/insights/math";
import { cn } from "@/lib/utils";

export const funnelSteps = [
  { name: "view_visa", label: "شاهد صفحة الدولة" },
  { name: "begin_application", label: "بدأ الطلب" },
  { name: "travelers_done", label: "أكمل بيانات المسافرين" },
  { name: "documents_done", label: "رفع المستندات" },
  { name: "reach_payment", label: "وصل لصفحة الدفع" },
  { name: "payment_start", label: "بدأ الدفع" },
  { name: "payment_success", label: "اكتمل الدفع" },
] as const;

export const eventLabels: Record<string, string> = {
  ...Object.fromEntries(funnelSteps.map((step) => [step.name, step.label])),
  payment_failed: "فشل الدفع",
  offer_click: "نقرة العرض الإضافي",
  application_submitted: "أُرسل الطلب",
};

export type FunnelStep = { name: string; label: string; n: number; previous?: number };

export function buildFunnel(rows: { name: string; now: number; previous: number }[]): FunnelStep[] {
  const byName = new Map(rows.map((row) => [row.name, row]));
  return funnelSteps.map((step) => ({ name: step.name, label: step.label, n: byName.get(step.name)?.now ?? 0, previous: byName.get(step.name)?.previous ?? 0 }));
}

function rateTone(rate: number): Tone {
  if (rate >= 60) return "success";
  if (rate >= 30) return "warning";
  return "danger";
}

/** Biggest step-to-step loss among steps that had traffic. */
export function worstDrop(steps: FunnelStep[]) {
  let worst: { from: FunnelStep; to: FunnelStep; drop: number } | null = null;
  for (let index = 1; index < steps.length; index += 1) {
    const from = steps[index - 1];
    const to = steps[index];
    if (from.n === 0) continue;
    const drop = 100 - pct(to.n, from.n);
    if (drop > 0 && (!worst || drop > worst.drop)) worst = { from, to, drop };
  }
  return worst;
}

export function Funnel({ steps, compact, comparePrevious }: { steps: FunnelStep[]; compact?: boolean; comparePrevious?: boolean }) {
  const top = Math.max(...steps.map((step) => step.n), 0);
  const first = steps[0]?.n ?? 0;
  return (
    <ol className="space-y-1.5">
      {steps.map((step, index) => {
        const prev = index > 0 ? steps[index - 1] : null;
        const conversion = prev && prev.n > 0 ? pct(step.n, prev.n) : null;
        const width = top > 0 ? Math.max(step.n > 0 ? 2 : 0, Math.round((step.n / top) * 100)) : 0;
        const delta = comparePrevious && step.previous != null ? change(step.n, step.previous) : null;
        return (
          <li key={step.name} className={compact && index > 0 ? "pt-1.5" : undefined}>
            {prev && !compact ? (
              <div className={cn("flex items-center gap-2 ps-8 text-[11px] text-muted-foreground", compact ? "py-0.5" : "py-1")}>
                <span className="text-muted-foreground/50">↓</span>
                {conversion === null ? (
                  <span>لا حركة في الخطوة السابقة</span>
                ) : (
                  <>
                    <Pill tone={rateTone(conversion)} className="px-2 py-0 font-mono text-[11px] tabular-nums">
                      {conversion}%
                    </Pill>
                    <span>انتقلوا</span>
                    {conversion < 100 ? <span className="text-muted-foreground/70">· تسرّب {100 - conversion}%</span> : null}
                  </>
                )}
              </div>
            ) : null}
            <div className="flex items-baseline gap-3">
              <span className="w-5 shrink-0 font-mono text-[11px] tabular-nums text-primary/70">{String(index + 1).padStart(2, "0")}</span>
              <span className="min-w-0 flex-1 truncate text-sm">{step.label}</span>
              {compact && conversion !== null ? (
                <span title="نسبة الانتقال من الخطوة السابقة">
                  <Pill tone={rateTone(conversion)} className="px-2 py-0 font-mono text-[11px] tabular-nums">
                    {conversion}%
                  </Pill>
                </span>
              ) : null}
              {delta !== null ? (
                <span className={cn("shrink-0 font-mono text-[11px] tabular-nums", delta === 0 ? "text-muted-foreground" : delta > 0 ? "text-emerald-400" : "text-rose-400")}>
                  {delta > 0 ? "▲" : delta < 0 ? "▼" : "•"} {Math.abs(delta)}%
                </span>
              ) : null}
              <span className="shrink-0 font-mono text-sm font-medium tabular-nums">{count(step.n)}</span>
              {!compact ? <span className="hidden w-14 shrink-0 text-end font-mono text-[11px] tabular-nums text-muted-foreground sm:inline">{index === 0 ? "100%" : `${pct(step.n, first)}%`}</span> : null}
            </div>
            <div className="mt-1.5 ps-8">
              <span className={cn("block overflow-hidden rounded-full bg-muted", compact ? "h-1.5" : "h-2.5")}>
                <span
                  className={cn("block h-full rounded-full", index === steps.length - 1 ? "bg-emerald-400" : "bg-gradient-to-r from-sky-500 to-sky-300")}
                  style={{ width: `${width}%` }}
                />
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

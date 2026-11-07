export type RefundVerdict = "yes" | "review" | "no" | "none" | "unknown";

export const verdictTone: Record<RefundVerdict, string> = {
  yes: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  review: "bg-amber-50 text-amber-900 ring-amber-200",
  no: "bg-rose-50 text-rose-800 ring-rose-200",
  none: "bg-slate-100 text-slate-700 ring-slate-200",
  unknown: "bg-brand-50 text-brand-700 ring-brand-100",
};

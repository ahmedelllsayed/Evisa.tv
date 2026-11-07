import { linesOf } from "@/lib/cms/registry";
import { t } from "@/lib/i18n";
import type { ApplicationStatus } from "@/lib/types";
import type { RefundVerdict } from "@/components/trust/verdict";

export type RefundStage = {
  stage: string;
  happens: string;
  refund: string;
  reason: string;
  verdict: RefundVerdict;
  statuses: string[];
};

const verdicts = new Set<RefundVerdict>(["yes", "review", "no", "none"]);
const statusKeys = new Set<ApplicationStatus>(["draft", "payment_pending", "submitted", "in_review", "filed", "approved", "rejected", "cancelled", "refunded"]);

/** Older CMS rows have only four columns; read the refund cell when the verdict column is missing. */
function guessVerdict(refund: string): RefundVerdict {
  const text = refund.toLowerCase();
  if (/can be requested|يمكن طلب/.test(text)) return "yes";
  if (/review|مراجعة/.test(text)) return "review";
  if (/nothing to refund|لا يوجد ما/.test(text)) return "none";
  if (/^no\b|^لا\s/.test(text)) return "no";
  return "unknown";
}

export function refundStages(rows: string | undefined, locale: string): RefundStage[] {
  return linesOf(rows)
    .filter((parts) => parts[0])
    .map((parts) => {
      const flag = (parts[4] ?? "").toLowerCase() as RefundVerdict;
      const statuses = (parts[5] ?? "")
        .split(",")
        .map((key) => key.trim() as ApplicationStatus)
        .filter((key) => statusKeys.has(key))
        .map((key) => t(locale, `status.${key}`));
      return {
        stage: parts[0] ?? "",
        happens: parts[1] ?? "",
        refund: parts[2] ?? "",
        reason: parts[3] ?? "",
        verdict: verdicts.has(flag) ? flag : guessVerdict(parts[2] ?? ""),
        statuses,
      };
    });
}

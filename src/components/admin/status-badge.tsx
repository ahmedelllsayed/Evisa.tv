import { Pill } from "@/components/admin/chrome";
import { paymentLabel, paymentTone, statusTone } from "@/components/admin/format";
import { statusLabels } from "@/components/admin/status";

export function StatusBadge({ status }: { status: string }) {
  return (
    <Pill tone={statusTone[status] ?? "neutral"} dot>
      {statusLabels[status] ?? status}
    </Pill>
  );
}

export function PaymentBadge({ status }: { status: string }) {
  return (
    <Pill tone={paymentTone[status] ?? "neutral"} dot>
      {paymentLabel[status] ?? status}
    </Pill>
  );
}

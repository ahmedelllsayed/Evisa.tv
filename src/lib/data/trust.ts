import "server-only";
import { iso, isoOrNull, num, one, sql } from "./db";

export type FeeAuditRow = {
  id: string;
  changedAt: string;
  oldTotal: number;
  newTotal: number;
  reason: string | null;
  optionLabel: string | null;
  optionLabelAr: string | null;
  destinationId: string;
  destinationName: string;
  destinationNameAr: string | null;
  destinationCode: string;
  destinationSlug: string;
  destinationActive: boolean;
  currency: string;
};

/** Public fee history. The editor's email is deliberately not selected. */
export async function listFeeAudit(): Promise<FeeAuditRow[]> {
  const rows = await sql(
    `select f.id, f.changed_at, f.old_total, f.new_total, f.reason, f.option_label,
            o.label_ar as option_label_ar,
            d.id as destination_id, d.name, d.name_ar, d.code, d.slug, d.currency,
            (d.is_active and d.visa_required) as destination_active
     from fee_changes f
     join destinations d on d.id = f.destination_id
     left join visa_options o on o.id = f.visa_option_id
     order by f.changed_at desc
     limit 500`,
  );
  return rows.map((r) => ({
    id: String(r.id),
    changedAt: iso(r.changed_at),
    oldTotal: num(r.old_total),
    newTotal: num(r.new_total),
    reason: (r.reason as string) || null,
    optionLabel: (r.option_label as string) || null,
    optionLabelAr: (r.option_label_ar as string) || null,
    destinationId: String(r.destination_id),
    destinationName: String(r.name),
    destinationNameAr: (r.name_ar as string) || null,
    destinationCode: String(r.code ?? "").trim(),
    destinationSlug: String(r.slug),
    destinationActive: Boolean(r.destination_active),
    currency: String(r.currency ?? "EGP").trim(),
  }));
}

export const ON_TIME_MIN_DECIDED = 20;

/**
 * Paid applications whose outcome against the target date is known.
 * Late counts approved or rejected after the target, open files past the target,
 * and refunds or cancellations made after the target. Files closed early without a decision are left out.
 */
export async function onTimePerformance(): Promise<{ onTime: number; late: number; decided: number }> {
  const row = await one<{ on_time: number; late: number }>(
    `with paid as (
       select a.status, a.guaranteed_at,
              coalesce(
                (select min(h.created_at) from application_status_history h where h.application_id = a.id and h.to_status = a.status),
                case when a.status = 'approved' then a.delivered_at end,
                a.updated_at
              ) as closed_at
       from applications a
       where a.paid_at is not null and a.guaranteed_at is not null
     )
     select
       count(*) filter (where status in ('approved', 'rejected') and closed_at <= guaranteed_at)::int as on_time,
       count(*) filter (where
         (status in ('approved', 'rejected') and closed_at > guaranteed_at)
         or (status in ('submitted', 'in_review', 'filed') and guaranteed_at < now())
         or (status in ('refunded', 'cancelled') and closed_at > guaranteed_at)
       )::int as late
     from paid`,
  );
  const onTime = num(row?.on_time);
  const late = num(row?.late);
  return { onTime, late, decided: onTime + late };
}

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return Promise.race([promise, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);
}

export async function pingDatabase(): Promise<{ ok: boolean; ms: number | null }> {
  const started = performance.now();
  try {
    await withTimeout(sql("select 1 as ok"), 4000);
    return { ok: true, ms: Math.max(1, Math.round(performance.now() - started)) };
  } catch {
    return { ok: false, ms: null };
  }
}

/** Timestamps only, so the page shows that work is moving without exposing volumes. */
export async function operationsPulse(): Promise<{ lastPaidAt: string | null; lastStaffUpdateAt: string | null }> {
  const row = await withTimeout(
    one<{ last_paid: unknown; last_staff: unknown }>(
      `select (select max(paid_at) from applications) as last_paid,
              (select max(created_at) from application_status_history where actor_id is not null) as last_staff`,
    ),
    4000,
  );
  return { lastPaidAt: isoOrNull(row?.last_paid), lastStaffUpdateAt: isoOrNull(row?.last_staff) };
}

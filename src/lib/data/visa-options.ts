import "server-only";
import type { Db } from "@/lib/db/core";
import type { VisaDetails, VisaOption, VisaOptionInput, VisaType } from "@/lib/types";
import { governmentFeeCharged } from "@/lib/visa";
import { json, num, numOrNull, one, sql } from "./db";

type Row = Record<string, unknown>;

const OPTION_SELECT = `
  select o.*, d.currency
  from visa_options o
  join destinations d on d.id = o.destination_id`;

export function toVisaOption(r: Row): VisaOption {
  const documents = r.documents == null ? null : json<string[]>(r.documents, []);
  return {
    id: String(r.id),
    destinationId: String(r.destination_id),
    label: String(r.label),
    labelAr: (r.label_ar as string) ?? null,
    visaType: r.visa_type as VisaType,
    embassyVisit: Boolean(r.embassy_visit),
    method: (r.method as string) ?? null,
    methodAr: (r.method_ar as string) ?? null,
    validity: (r.validity as string) ?? null,
    validityAr: (r.validity_ar as string) ?? null,
    stay: (r.stay as string) ?? null,
    stayAr: (r.stay_ar as string) ?? null,
    entry: (r.entry as string) ?? null,
    entryAr: (r.entry_ar as string) ?? null,
    govFee: num(r.gov_fee),
    serviceFee: num(r.service_fee),
    currency: String(r.currency ?? "EGP").trim(),
    processingHours: numOrNull(r.processing_hours),
    expressHours: numOrNull(r.express_hours),
    expressFee: numOrNull(r.express_fee),
    documents: documents && documents.length ? documents : null,
    isDefault: Boolean(r.is_default),
    isActive: Boolean(r.is_active),
    sortOrder: num(r.sort_order),
  };
}

export function snapshotVisaOption(option: VisaOption): VisaDetails {
  return {
    stay: option.stay,
    stayAr: option.stayAr,
    validity: option.validity,
    validityAr: option.validityAr,
    entry: option.entry,
    entryAr: option.entryAr,
    visaType: option.visaType,
    method: option.method,
    methodAr: option.methodAr,
    embassyVisit: option.embassyVisit,
    processingHours: option.processingHours,
    expressHours: option.expressHours,
  };
}

export async function listVisaOptions(destinationId: string, opts: { includeInactive?: boolean } = {}) {
  const rows = await sql(
    `${OPTION_SELECT} where o.destination_id = $1 ${opts.includeInactive ? "" : "and o.is_active"} order by o.sort_order, o.created_at`,
    [destinationId],
  );
  return rows.map(toVisaOption);
}

export async function listAllVisaOptions() {
  const rows = await sql(`${OPTION_SELECT} order by d.name, o.sort_order, o.created_at`);
  return rows.map(toVisaOption);
}

export async function getActiveVisaOption(destinationId: string, optionId: string) {
  const row = await one(`${OPTION_SELECT} where o.id = $1 and o.destination_id = $2 and o.is_active`, [optionId, destinationId]);
  return row ? toVisaOption(row) : null;
}

export async function getDefaultVisaOption(destinationId: string) {
  const row = await one(
    `${OPTION_SELECT} where o.destination_id = $1 and o.is_active order by o.is_default desc, o.sort_order, o.created_at limit 1`,
    [destinationId],
  );
  return row ? toVisaOption(row) : null;
}

function chargedTotal(input: { govFee: number; serviceFee: number; visaType: VisaType; embassyVisit: boolean }) {
  return governmentFeeCharged(input) + input.serviceFee;
}

export async function saveVisaOptions(tx: Pick<Db, "query">, destinationId: string, inputs: VisaOptionInput[]) {
  const existing = await tx.query<Row>("select * from visa_options where destination_id = $1", [destinationId]);
  const byId = new Map(existing.map((row) => [String(row.id), row]));
  await tx.query("update visa_options set is_default = false where destination_id = $1", [destinationId]);
  const kept = new Set<string>();

  for (const input of inputs) {
    const id = input.id?.trim() || null;
    if (id && !byId.has(id)) throw new Error("نوع التأشيرة لا يتبع هذه الدولة.");
    const params = [
      input.label,
      input.labelAr,
      input.visaType,
      input.embassyVisit,
      input.method,
      input.methodAr,
      input.validity,
      input.validityAr,
      input.stay,
      input.stayAr,
      input.entry,
      input.entryAr,
      input.govFee,
      input.serviceFee,
      input.processingHours,
      input.expressHours,
      input.expressFee,
      input.documents ? JSON.stringify(input.documents) : null,
      input.isDefault,
      input.isActive,
      input.sortOrder,
    ];
    if (id) {
      kept.add(id);
      const before = byId.get(id)!;
      const oldTotal = chargedTotal({
        govFee: num(before.gov_fee),
        serviceFee: num(before.service_fee),
        visaType: before.visa_type as VisaType,
        embassyVisit: Boolean(before.embassy_visit),
      });
      const newTotal = chargedTotal(input);
      await tx.query(
        `update visa_options set label=$2, label_ar=$3, visa_type=$4, embassy_visit=$5, method=$6, method_ar=$7,
           validity=$8, validity_ar=$9, stay=$10, stay_ar=$11, entry=$12, entry_ar=$13, gov_fee=$14, service_fee=$15,
           processing_hours=$16, express_hours=$17, express_fee=$18, documents=$19::jsonb, is_default=$20, is_active=$21,
           sort_order=$22, updated_at=now()
         where id=$1 and destination_id=$23`,
        [id, ...params, destinationId],
      );
      if (oldTotal !== newTotal) {
        await tx.query(
          "insert into fee_changes (destination_id, visa_option_id, option_label, old_total, new_total, reason) values ($1,$2,$3,$4,$5,$6)",
          [destinationId, id, input.label, oldTotal, newTotal, "Fee updated"],
        );
      }
    } else {
      await tx.query(
        `insert into visa_options (
           destination_id, label, label_ar, visa_type, embassy_visit, method, method_ar,
           validity, validity_ar, stay, stay_ar, entry, entry_ar, gov_fee, service_fee,
           processing_hours, express_hours, express_fee, documents, is_default, is_active, sort_order
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19::jsonb,$20,$21,$22)`,
        [destinationId, ...params],
      );
    }
  }

  for (const row of existing) {
    const id = String(row.id);
    if (kept.has(id)) continue;
    const used = await tx.query("select 1 from applications where visa_option_id = $1 limit 1", [id]);
    if (used.length) {
      await tx.query("update visa_options set is_active = false, is_default = false, updated_at = now() where id = $1", [id]);
    } else {
      await tx.query("delete from visa_options where id = $1", [id]);
    }
  }
}

export type VisaOptionStat = {
  id: string;
  destinationId: string;
  destinationName: string;
  destinationSlug: string;
  label: string;
  labelAr: string | null;
  total: number;
  open: number;
  paid: number;
  revenue: number;
};

export async function visaOptionStats(slug?: string) {
  const rows = await sql(
    `select o.id, o.destination_id, d.name as destination_name, d.slug as destination_slug, o.label, o.label_ar,
            count(a.id)::int as total,
            count(a.id) filter (where a.status not in ('approved', 'rejected', 'cancelled', 'refunded'))::int as open,
            count(a.id) filter (where a.paid_at is not null)::int as paid,
            coalesce(sum(a.total_amount) filter (where a.paid_at is not null), 0) as revenue
     from visa_options o
     join destinations d on d.id = o.destination_id
     left join applications a on a.visa_option_id = o.id
     where ($1::text is null or d.slug = $1)
     group by o.id, d.name, d.slug
     order by d.name, o.sort_order`,
    [slug ?? null],
  );
  return rows.map(toStat);
}

export async function recentVisaOptionStats(limit = 8) {
  const rows = await sql(
    `select o.id, o.destination_id, d.name as destination_name, d.slug as destination_slug, o.label, o.label_ar,
            count(a.id)::int as total,
            0::int as open,
            count(a.id) filter (where a.paid_at is not null)::int as paid,
            coalesce(sum(a.total_amount) filter (where a.paid_at is not null), 0) as revenue
     from visa_options o
     join destinations d on d.id = o.destination_id
     join applications a on a.visa_option_id = o.id and a.created_at > now() - interval '30 days'
     group by o.id, d.name, d.slug
     order by total desc
     limit $1`,
    [limit],
  );
  return rows.map(toStat);
}

function toStat(row: Row): VisaOptionStat {
  return {
    id: String(row.id),
    destinationId: String(row.destination_id),
    destinationName: String(row.destination_name),
    destinationSlug: String(row.destination_slug),
    label: String(row.label),
    labelAr: (row.label_ar as string) ?? null,
    total: num(row.total),
    open: num(row.open),
    paid: num(row.paid),
    revenue: num(row.revenue),
  };
}

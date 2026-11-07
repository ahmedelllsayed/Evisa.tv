import "server-only";
import type { ApplicationStatus, Destination } from "@/lib/types";
import { one, sql } from "./db";

export type ContactApplication = {
  id: string;
  reference: string;
  destination: string;
  destinationAr: string | null;
  destinationCode: string | null;
  status: ApplicationStatus;
};

export async function listContactApplications(userId: string): Promise<ContactApplication[]> {
  const rows = await sql(
    `select a.id, a.reference, a.status, d.name, d.name_ar, d.code
     from applications a join destinations d on d.id = a.destination_id
     where a.user_id = $1 order by a.created_at desc limit 20`,
    [userId],
  );
  return rows.map((row) => ({
    id: String(row.id),
    reference: String(row.reference),
    destination: String(row.name),
    destinationAr: (row.name_ar as string) ?? null,
    destinationCode: row.code ? String(row.code).trim() : null,
    status: row.status as ApplicationStatus,
  }));
}

export async function findOwnedApplication(userId: string, applicationId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(applicationId)) return null;
  const row = await one<{ id: string; reference: string }>("select id, reference from applications where id = $1 and user_id = $2", [
    applicationId,
    userId,
  ]);
  return row ? { id: String(row.id), reference: String(row.reference) } : null;
}

export async function recentContactCount(email: string) {
  const row = await one<{ n: number }>(
    "select count(*)::int as n from contact_messages where lower(email) = lower($1) and created_at > now() - interval '1 hour'",
    [email],
  );
  return row?.n ?? 0;
}

const ipWindowMs = 10 * 60 * 1000;
const ipLimit = 6;
const ipHits = new Map<string, number[]>();

/** Per-process window; the per-email limit in the database is the durable one. */
export function contactIpLimited(ip: string) {
  const now = Date.now();
  const hits = (ipHits.get(ip) ?? []).filter((at) => now - at < ipWindowMs);
  if (hits.length >= ipLimit) {
    ipHits.set(ip, hits);
    return true;
  }
  hits.push(now);
  ipHits.set(ip, hits);
  if (ipHits.size > 5000) ipHits.clear();
  return false;
}

export type FastDestination = {
  id: string;
  slug: string;
  name: string;
  nameAr: string | null;
  code: string;
  flag: string | null;
  processingHours: number | null;
  expressHours: number | null;
  fastest: number;
};

/** Destinations that need a visa, ordered by the quickest processing target they publish. */
export function fastestDestinations(destinations: Destination[], limit = 6): FastDestination[] {
  return destinations
    .filter((d) => d.isActive && d.visaRequired && (d.processingHours !== null || d.expressHours !== null))
    .map((d) => ({
      id: d.id,
      slug: d.slug,
      name: d.name,
      nameAr: d.nameAr ?? null,
      code: d.code,
      flag: d.flag ?? null,
      processingHours: d.processingHours,
      expressHours: d.expressHours,
      fastest: Math.min(d.expressHours ?? Infinity, d.processingHours ?? Infinity),
    }))
    .sort((a, b) => a.fastest - b.fastest || a.name.localeCompare(b.name))
    .slice(0, limit);
}

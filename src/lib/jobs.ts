import "server-only";
import { failPendingPayments } from "@/lib/data/applications";
import { sql } from "@/lib/data/db";
import { processOutbox } from "@/lib/data/outbox";

export async function runJob(job: string) {
  if (job === "mail") {
    await processOutbox(25);
    return { ok: true as const, job };
  }
  if (job === "payments") {
    const rows = await sql<{ id: string }>(
      "select distinct application_id as id from payments where status = 'pending' and created_at < now() - interval '30 minutes'",
    );
    for (const row of rows) await failPendingPayments(row.id, true);
    return { ok: true as const, job, expired: rows.length };
  }
  if (job === "cleanup") {
    await sql("delete from auth_attempts where created_at < now() - interval '7 days'");
    await sql("delete from local_otps where expires_at < now() - interval '1 day'");
    await sql("delete from funnel_events where created_at < now() - interval '180 days'");
    const days = Number(process.env.PASSPORT_RETENTION_DAYS ?? 90);
    if (Number.isFinite(days) && days > 0) {
      await sql(
        `delete from stored_files where path in (
           select d.storage_path from documents d
           join applications a on a.id = d.application_id
           where d.kind <> 'issued_visa'
             and a.status in ('approved', 'rejected', 'cancelled', 'refunded')
             and a.updated_at < now() - ($1::int * interval '1 day')
         )`,
        [days],
      );
    }
    return { ok: true as const, job };
  }
  return { ok: false as const, job };
}

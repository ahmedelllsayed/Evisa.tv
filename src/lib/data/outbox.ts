import "server-only";
import { sendMail } from "@/lib/email";
import { one, sql } from "./db";

export async function enqueueMail(input: {
  eventName: string;
  applicationId?: string | null;
  userId?: string | null;
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  const row = await one<{ id: string }>(
    `insert into notification_outbox (event_name, application_id, user_id, to_email, subject, body_text, body_html)
     values ($1,$2,$3,$4,$5,$6,$7) returning id`,
    [input.eventName, input.applicationId ?? null, input.userId ?? null, input.to, input.subject, input.text, input.html ?? null],
  );
  if (!row) return { sent: false as const };
  return deliverOutbox(row.id, input);
}

async function deliverOutbox(
  id: string,
  input: { to: string; subject: string; text: string; html?: string },
) {
  try {
    const result = await sendMail({ to: input.to, subject: input.subject, text: input.text, html: input.html, idempotencyKey: id });
    if (result.sent) {
      await sql("update notification_outbox set status = 'sent', sent_at = now(), attempts = attempts + 1 where id = $1", [id]);
      return { sent: true as const };
    }
    await sql(
      `update notification_outbox
       set attempts = attempts + 1, last_error = 'not sent', status = case when attempts + 1 >= 5 then 'dead' else 'pending' end
       where id = $1`,
      [id],
    );
    return { sent: false as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "send failed";
    await sql(
      `update notification_outbox
       set attempts = attempts + 1, last_error = $2, status = case when attempts + 1 >= 5 then 'dead' else 'pending' end
       where id = $1`,
      [id, message.slice(0, 300)],
    ).catch(() => undefined);
    return { sent: false as const };
  }
}

/** Retries a few pending messages. A mail failure stays in the outbox and does not roll back the caller. */
export async function processOutbox(limit = 5) {
  const rows = await sql<{ id: string; to_email: string; subject: string; body_text: string; body_html: string | null }>(
    `select id, to_email, subject, body_text, body_html from notification_outbox
     where status = 'pending' and attempts < 5 order by created_at limit $1`,
    [limit],
  );
  for (const row of rows) {
    await deliverOutbox(row.id, { to: row.to_email, subject: row.subject, text: row.body_text, html: row.body_html ?? undefined });
  }
}

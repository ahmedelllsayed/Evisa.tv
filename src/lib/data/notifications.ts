import "server-only";
import { iso, isoOrNull, one, sql } from "@/lib/data/db";
import type { AccountNotification } from "@/lib/account";

export async function notifyUser(input: {
  userId: string;
  applicationId?: string | null;
  title: string;
  body?: string | null;
}) {
  try {
    await sql(
      `insert into user_notifications (user_id, application_id, title, body) values ($1,$2,$3,$4)`,
      [input.userId, input.applicationId ?? null, input.title, input.body ?? null],
    );
  } catch (error) {
    console.error("[notify]", error instanceof Error ? error.message : error);
  }
}

export async function listNotifications(userId: string, limit = 20): Promise<AccountNotification[]> {
  const rows = await sql(
    `select id, application_id, title, body, read_at, created_at
     from user_notifications where user_id = $1
     order by created_at desc limit $2`,
    [userId, limit],
  );
  return rows.map((row) => ({
    id: String(row.id),
    applicationId: (row.application_id as string) ?? null,
    title: String(row.title),
    body: (row.body as string) ?? null,
    readAt: isoOrNull(row.read_at),
    createdAt: iso(row.created_at),
  }));
}

export async function unreadNotificationCount(userId: string) {
  const row = await one<{ n: number }>(
    "select count(*)::int as n from user_notifications where user_id = $1 and read_at is null",
    [userId],
  );
  return row?.n ?? 0;
}

export async function markNotificationsRead(userId: string) {
  await sql("update user_notifications set read_at = now() where user_id = $1 and read_at is null", [userId]);
}

import "server-only";
import { iso, one, sql } from "./db";

export type AccountRow = {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: "user" | "admin";
  banned: boolean;
  createdAt: string;
  applicationCount: number;
};

export type UserInput = {
  email: string;
  fullName: string;
  phone: string;
  role: "user" | "admin";
};

function toUser(row: Record<string, unknown>): AccountRow {
  return {
    id: String(row.id),
    email: String(row.email),
    fullName: (row.full_name as string) ?? null,
    phone: (row.phone as string) ?? null,
    role: row.role === "admin" ? "admin" : "user",
    banned: Boolean(row.banned),
    createdAt: iso(row.created_at),
    applicationCount: Number(row.application_count ?? 0),
  };
}

function clean(input: UserInput) {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false as const, error: "البريد غير صالح." };
  return {
    ok: true as const,
    email,
    fullName: input.fullName.trim() || null,
    phone: input.phone.trim() || null,
    role: input.role === "admin" ? ("admin" as const) : ("user" as const),
  };
}

function duplicate(error: unknown) {
  const text = String(error);
  return text.includes("23505") || text.includes("duplicate") || text.includes("unique");
}

export async function listUsers(): Promise<AccountRow[]> {
  const rows = await sql(
    `select p.*, (select count(*)::int from applications a where a.user_id = p.id) as application_count
     from profiles p order by p.created_at desc`,
  );
  return rows.map(toUser);
}

async function lastAdmin(id: string) {
  const current = await one<{ role: string }>("select role from profiles where id = $1", [id]);
  if (current?.role !== "admin") return false;
  const count = await one<{ count: number }>("select count(*)::int as count from profiles where role = 'admin'");
  return (count?.count ?? 0) <= 1;
}

export async function setUserBanned(id: string, banned: boolean) {
  if (!banned) {
    await sql("update profiles set banned = false where id = $1", [id]);
    return { ok: true as const };
  }
  if (await lastAdmin(id)) return { ok: false as const, error: "لا يمكن حظر آخر مدير." };
  await sql("update profiles set banned = true where id = $1", [id]);
  return { ok: true as const };
}

export async function setUserRole(id: string, role: "user" | "admin") {
  if (role === "user" && (await lastAdmin(id))) {
    return { ok: false as const, error: "لا يمكن إزالة صلاحية آخر مدير." };
  }
  await sql("update profiles set role = $2 where id = $1", [id, role]);
  return { ok: true as const };
}

export async function createUser(input: UserInput) {
  const fields = clean(input);
  if (!fields.ok) return fields;
  try {
    await sql("insert into profiles (email, full_name, phone, role) values ($1, $2, $3, $4)", [
      fields.email,
      fields.fullName,
      fields.phone,
      fields.role,
    ]);
  } catch (error) {
    if (duplicate(error)) return { ok: false as const, error: "هذا البريد مسجل مسبقًا." };
    throw error;
  }
  return { ok: true as const };
}

export async function updateUser(id: string, input: UserInput) {
  const fields = clean(input);
  if (!fields.ok) return fields;
  if (fields.role === "user" && (await lastAdmin(id))) {
    return { ok: false as const, error: "لا يمكن إزالة صلاحية آخر مدير." };
  }
  try {
    const updated = await sql("update profiles set email = $2, full_name = $3, phone = $4, role = $5 where id = $1 returning id", [
      id,
      fields.email,
      fields.fullName,
      fields.phone,
      fields.role,
    ]);
    if (!updated.length) return { ok: false as const, error: "المستخدم غير موجود." };
  } catch (error) {
    if (duplicate(error)) return { ok: false as const, error: "هذا البريد مسجل مسبقًا." };
    throw error;
  }
  return { ok: true as const };
}

export async function deleteUser(id: string, actorId: string) {
  if (id === actorId) return { ok: false as const, error: "لا يمكنك حذف حسابك الحالي." };
  if (await lastAdmin(id)) return { ok: false as const, error: "لا يمكن حذف آخر مدير." };
  await sql("update applications set assignee_id = null where assignee_id = $1", [id]);
  const removed = await sql("delete from profiles where id = $1 returning id", [id]);
  if (!removed.length) return { ok: false as const, error: "المستخدم غير موجود." };
  return { ok: true as const };
}

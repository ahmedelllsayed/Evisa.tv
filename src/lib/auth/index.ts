import "server-only";
import { createHash, createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { t, tf } from "@/lib/i18n";
import { cache } from "react";
import { siteConfig } from "@/config/site.config";
import { sendMail } from "@/lib/email";
import { getSiteSettings } from "@/lib/data/settings";
import { one, sql } from "@/lib/data/db";
import { env, serverEnv, supabaseEnabled } from "@/lib/env";
import { safeNextPath } from "@/lib/safe-path";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { User } from "@/lib/types";

const SESSION_COOKIE = "app_session";
const SESSION_DAYS = 30;

function toUser(r: Record<string, unknown>): User {
  return {
    id: String(r.id),
    email: String(r.email),
    fullName: (r.full_name as string) ?? null,
    phone: (r.phone as string) ?? null,
    role: r.role === "admin" ? "admin" : "user",
  };
}

/** Creates or updates the profile row and applies ADMIN_EMAILS. */
async function syncProfile(id: string | null, email: string, fullName?: string | null) {
  const role = serverEnv().adminEmails.includes(email.toLowerCase()) ? "admin" : null;
  const row = id
    ? await one(
        `insert into profiles (id, email, full_name, role) values ($1, $2, $3, coalesce($4, 'user'))
         on conflict (id) do update set email = excluded.email,
           full_name = coalesce(profiles.full_name, excluded.full_name),
           role = coalesce($4, profiles.role)
         returning *`,
        [id, email.toLowerCase(), fullName ?? null, role],
      )
    : await one(
        `insert into profiles (email, full_name, role) values ($1, $2, coalesce($3, 'user'))
         on conflict (email) do update set role = coalesce($3, profiles.role)
         returning *`,
        [email.toLowerCase(), fullName ?? null, role],
      );
  return toUser(row!);
}

// ----- Local sessions (used when Supabase Auth is not configured) -----

function sign(value: string) {
  return createHmac("sha256", serverEnv().authSecret).update(value).digest("base64url");
}

function encodeSession(userId: string) {
  const expires = Date.now() + SESSION_DAYS * 864e5;
  const payload = `${userId}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

function decodeSession(token: string | undefined) {
  if (!token) return null;
  const [userId, expires, signature] = token.split(".");
  if (!userId || !expires || !signature) return null;
  const expected = Buffer.from(sign(`${userId}.${expires}`));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  if (Number(expires) < Date.now()) return null;
  return userId;
}

function hashCode(email: string, code: string) {
  return createHash("sha256").update(`${email}:${code}:${serverEnv().authSecret}`).digest("hex");
}

// ----- Public API -----

export const getCurrentUser = cache(async (): Promise<User | null> => {
  if (supabaseEnabled) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user?.email) return null;
    const existing = await one("select * from profiles where id = $1", [data.user.id]);
    if (existing && !serverEnv().adminEmails.includes(String(existing.email))) return toUser(existing);
    return syncProfile(data.user.id, data.user.email, data.user.user_metadata?.full_name ?? data.user.user_metadata?.name);
  }
  const userId = decodeSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!userId) return null;
  const row = await one("select * from profiles where id = $1", [userId]);
  return row ? toUser(row) : null;
});

export async function requireUser(locale: string, next?: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/sign-in${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return user;
}

export async function requireAdmin(locale: string): Promise<User> {
  const user = await requireUser(locale, `/${locale}/admin/queue`);
  if (user.role !== "admin") redirect(`/${locale}`);
  return user;
}

export type OtpResult = { ok: true; devCode?: string } | { ok: false; error: string };

export async function sendEmailCode(email: string, locale = "en-EG"): Promise<OtpResult> {
  const normalized = email.trim().toLowerCase();
  if (supabaseEnabled) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithOtp({ email: normalized, options: { shouldCreateUser: true } });
    return error ? { ok: false, error: error.message } : { ok: true };
  }
  const recent = await one<{ too_soon: boolean }>(
    "select expires_at > now() + interval '9 minutes' as too_soon from local_otps where email = $1",
    [normalized],
  );
  if (recent?.too_soon) return { ok: false, error: t(locale, "err.wait") };
  const code = String(randomInt(100000, 1000000));
  await sql(
    `insert into local_otps (email, code_hash, attempts, expires_at) values ($1, $2, 0, now() + interval '10 minutes')
     on conflict (email) do update set code_hash = excluded.code_hash, attempts = 0, expires_at = excluded.expires_at`,
    [normalized, hashCode(normalized, code)],
  );
  const settings = await getSiteSettings();
  const mailed = await sendMail({
    to: normalized,
    subject: tf(locale, "mail.codeSubject", { name: settings.name }),
    text: tf(locale, "mail.codeBody", { code }),
    idempotencyKey: `otp/${normalized}/${hashCode(normalized, code)}`,
  });
  if (process.env.RESEND_API_KEY && !mailed.sent) {
    return { ok: false, error: t(locale, "err.sendCode") };
  }
  if (process.env.NODE_ENV !== "production") console.info(`[auth] sign-in code for ${normalized}: ${code}`);
  return { ok: true, devCode: process.env.NODE_ENV === "production" ? undefined : code };
}

export async function verifyEmailCode(email: string, code: string, locale = "en-EG"): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
  const normalized = email.trim().toLowerCase();
  if (supabaseEnabled) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.verifyOtp({ email: normalized, token: code.trim(), type: "email" });
    if (error || !data.user?.email) return { ok: false, error: error?.message ?? t(locale, "err.invalidCode") };
    return { ok: true, user: await syncProfile(data.user.id, data.user.email) };
  }
  const row = await one<{ code_hash: string }>(
    `update local_otps set attempts = attempts + 1
     where email = $1 and attempts < 5 and expires_at >= now()
     returning code_hash`,
    [normalized],
  );
  if (!row) return { ok: false, error: t(locale, "err.invalidCode") };
  const expected = hashCode(normalized, code.trim());
  const left = Buffer.from(row.code_hash);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return { ok: false, error: t(locale, "err.invalidCode") };
  }
  await sql("delete from local_otps where email = $1", [normalized]);
  const user = await syncProfile(null, normalized);
  (await cookies()).set(SESSION_COOKIE, encodeSession(user.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
  return { ok: true, user };
}

export async function googleSignInUrl(next: string): Promise<string | null> {
  if (!supabaseEnabled) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${env.siteUrl}/auth/callback?next=${encodeURIComponent(safeNextPath(next, `/${siteConfig.defaultLocale}/account`))}` },
  });
  return data.url ?? null;
}

export async function signOut() {
  if (supabaseEnabled) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  (await cookies()).delete(SESSION_COOKIE);
}

export async function updateProfile(userId: string, input: { fullName: string | null; phone: string | null }) {
  await sql("update profiles set full_name = $2, phone = $3 where id = $1", [userId, input.fullName, input.phone]);
}

export const authMode = supabaseEnabled ? "supabase" : "local";
export const defaultLocale = siteConfig.defaultLocale;

"use server";

import { redirect } from "next/navigation";
import { googleSignInUrl, sendEmailCode, verifyEmailCode } from "@/lib/auth";
import { safeNextPath } from "@/lib/safe-path";

export async function sendCodeAction(email: string) {
  return sendEmailCode(email);
}

export async function verifyCodeAction(email: string, code: string, next: string) {
  const result = await verifyEmailCode(email, code);
  if (!result.ok) return result;
  redirect(safeNextPath(next, "/"));
}

export async function googleAction(next: string) {
  const url = await googleSignInUrl(next);
  if (!url) return { ok: false as const, error: "Google sign-in is not configured" };
  redirect(url);
}

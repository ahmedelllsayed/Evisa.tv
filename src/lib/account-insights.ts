import type { ApplicationGapCount } from "@/lib/account";
import type { ApplicationStatus } from "@/lib/types";

const DAY = 86_400_000;

export const stages = ["details", "payment", "review", "filing", "decision"] as const;
export type Stage = (typeof stages)[number];

export type Tone = "brand" | "amber" | "green" | "red" | "slate";

const closed = new Set<ApplicationStatus>(["approved", "rejected", "cancelled", "refunded"]);

export function isClosedStatus(status: ApplicationStatus) {
  return closed.has(status);
}

export function isUnpaidStatus(status: ApplicationStatus) {
  return status === "draft" || status === "payment_pending";
}

/** Position on the five-step track; -1 when the file left the track (cancelled or refunded). */
export function stageIndex(status: ApplicationStatus) {
  switch (status) {
    case "draft":
      return 0;
    case "payment_pending":
      return 1;
    case "submitted":
    case "in_review":
      return 2;
    case "filed":
      return 3;
    case "approved":
    case "rejected":
      return 4;
    default:
      return -1;
  }
}

export function statusTone(status: ApplicationStatus): Tone {
  if (status === "approved") return "green";
  if (status === "rejected") return "red";
  if (status === "payment_pending") return "amber";
  if (status === "draft" || status === "cancelled" || status === "refunded") return "slate";
  return "brand";
}

function day(value: string) {
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Whole days from `now` until `value`; negative once it has passed. */
export function daysUntil(value: string | null | undefined, now = new Date()) {
  if (!value) return null;
  const date = day(value);
  if (!date) return null;
  return Math.ceil((date.getTime() - now.getTime()) / DAY);
}

/** Target-date countdown for paid files that are still moving. */
export function targetCountdown(status: ApplicationStatus, guaranteedAt: string | null, now = new Date()) {
  if (!guaranteedAt || isUnpaidStatus(status) || isClosedStatus(status)) return null;
  const days = daysUntil(guaranteedAt, now);
  if (days === null) return null;
  return { days, late: new Date(guaranteedAt).getTime() < now.getTime() };
}

export type PassportHealth = "missing" | "expired" | "short" | "ok";

/** Most destinations need six months of validity after arrival; with no trip date, count from today. */
export function passportHealth(expiry: string | null | undefined, options: { departure?: string | null; now?: Date } = {}): PassportHealth {
  if (!expiry) return "missing";
  const end = day(expiry);
  if (!end) return "missing";
  const now = options.now ?? new Date();
  if (end.getTime() < now.getTime()) return "expired";
  const from = (options.departure && day(options.departure)) || now;
  const limit = new Date(from);
  limit.setMonth(limit.getMonth() + 6);
  return end.getTime() < limit.getTime() ? "short" : "ok";
}

export type ProfileFacts = {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
  phone: string;
  documentKinds: string[];
};

export const profileItems = ["name", "birth", "nationality", "passport", "expiry", "phone", "scan", "photo"] as const;
export type ProfileItem = (typeof profileItems)[number];

export function profileChecklist(facts: ProfileFacts) {
  const has = new Set(facts.documentKinds);
  const done: Record<ProfileItem, boolean> = {
    name: Boolean(facts.firstName.trim() && facts.lastName.trim()),
    birth: facts.dateOfBirth === undefined ? true : Boolean(facts.dateOfBirth),
    nationality: Boolean(facts.nationality),
    passport: Boolean(facts.passportNumber.trim()),
    expiry: Boolean(facts.passportExpiry) && passportHealth(facts.passportExpiry) !== "expired",
    phone: facts.phone.replace(/\D/g, "").length >= 8,
    scan: has.has("passport"),
    photo: has.has("photo"),
  };
  const items = profileItems.map((id) => ({ id, done: done[id] }));
  const count = items.filter((item) => item.done).length;
  return { items, done: count, total: items.length, percent: Math.round((count / items.length) * 100) };
}

export type AccountTaskKind = "pay" | "fix_document" | "missing_document" | "visa_ready" | "draft" | "passport" | "profile";

export type AccountTask = {
  id: string;
  kind: AccountTaskKind;
  applicationId?: string;
  count?: number;
};

const weight: Record<AccountTaskKind, number> = {
  pay: 0,
  fix_document: 1,
  missing_document: 2,
  visa_ready: 3,
  draft: 4,
  passport: 5,
  profile: 6,
};

/** Everything the customer can act on, most urgent first. */
export function accountTasks(input: {
  apps: { id: string; status: ApplicationStatus; updatedAt: string }[];
  gaps: ApplicationGapCount[];
  visas: { applicationId: string; createdAt: string }[];
  passport: PassportHealth;
  profilePercent: number;
  now?: Date;
}): AccountTask[] {
  const now = input.now ?? new Date();
  const tasks: AccountTask[] = [];
  const gapByApp = new Map(input.gaps.map((gap) => [gap.applicationId, gap]));
  const recent = [...input.apps].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  for (const app of recent) {
    const gap = gapByApp.get(app.id);
    if (app.status === "payment_pending") tasks.push({ id: `pay-${app.id}`, kind: "pay", applicationId: app.id });
    else if (app.status === "draft") tasks.push({ id: `draft-${app.id}`, kind: "draft", applicationId: app.id, count: gap?.missing });
    else if (!isClosedStatus(app.status) && gap) {
      if (gap.rejected) tasks.push({ id: `fix-${app.id}`, kind: "fix_document", applicationId: app.id, count: gap.rejected });
      if (gap.missing) tasks.push({ id: `missing-${app.id}`, kind: "missing_document", applicationId: app.id, count: gap.missing });
    }
  }
  const seen = new Set<string>();
  for (const visa of input.visas) {
    if (seen.has(visa.applicationId) || now.getTime() - new Date(visa.createdAt).getTime() > 30 * DAY) continue;
    seen.add(visa.applicationId);
    tasks.push({ id: `visa-${visa.applicationId}`, kind: "visa_ready", applicationId: visa.applicationId });
  }
  if (input.passport === "expired" || input.passport === "short") tasks.push({ id: "passport", kind: "passport" });
  if (input.profilePercent < 100) tasks.push({ id: "profile", kind: "profile" });
  return tasks
    .map((task, order) => ({ task, order }))
    .sort((a, b) => weight[a.task.kind] - weight[b.task.kind] || a.order - b.order)
    .map(({ task }) => task);
}

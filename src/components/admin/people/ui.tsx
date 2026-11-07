import { Pill, type Tone } from "@/components/admin/chrome";
import { ROLE_LABELS } from "@/lib/rbac-constants";
import type { AdminRole } from "@/lib/types";
import { cn } from "@/lib/utils";

const roleTone: Record<AdminRole, Tone> = {
  super_admin: "warning",
  admin: "info",
  manager: "info",
  operator: "success",
  support: "success",
  viewer: "neutral",
  user: "neutral",
};

const roleAccent: Partial<Record<AdminRole, string>> = {
  manager: "border-violet-400/40 bg-violet-400/10 text-violet-300",
  support: "border-teal-400/40 bg-teal-400/10 text-teal-300",
};

export function RoleBadge({ role, className }: { role: AdminRole; className?: string }) {
  return (
    <Pill tone={roleTone[role]} dot={role !== "user"} className={cn(roleAccent[role], className)}>
      {ROLE_LABELS[role]}
    </Pill>
  );
}

export function initials(name: string | null | undefined, email: string) {
  const source = (name ?? "").trim();
  if (source) {
    const parts = source.split(/\s+/).filter(Boolean);
    return parts
      .slice(0, 2)
      .map((part) => Array.from(part)[0] ?? "")
      .join("")
      .toUpperCase();
  }
  return (Array.from(email)[0] ?? "?").toUpperCase();
}

export function Avatar({ name, email, size = "md", tone }: { name?: string | null; email: string; size?: "sm" | "md" | "lg"; tone?: "muted" | "primary" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border font-semibold",
        size === "sm" && "size-8 text-[11px]",
        size === "md" && "size-10 text-xs",
        size === "lg" && "size-14 text-base",
        tone === "primary" ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-muted text-foreground/80",
      )}
    >
      {initials(name, email)}
    </span>
  );
}

const topics: [RegExp, string, Tone][] = [
  [/refund|استرد|استرجاع/i, "استرداد", "danger"],
  [/pay|دفع|سداد/i, "الدفع", "warning"],
  [/doc|مستند|ورق|جواز/i, "المستندات", "info"],
  [/partner|شراك|وكال/i, "شراكة", "success"],
  [/general|عام|استفسار/i, "عام", "neutral"],
];

export function topicInfo(topic: string | null) {
  if (!topic?.trim()) return null;
  const match = topics.find(([pattern]) => pattern.test(topic));
  return match ? { label: match[1], tone: match[2] } : { label: topic.trim(), tone: "neutral" as Tone };
}

export function TopicChip({ topic }: { topic: string | null }) {
  const info = topicInfo(topic);
  if (!info) return null;
  return (
    <Pill tone={info.tone} className="px-2 py-0 text-[11px]">
      {info.label}
    </Pill>
  );
}

const dateFormat = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Cairo", day: "2-digit", month: "short", year: "numeric" });

export function shortDate(value: string | Date) {
  return dateFormat.format(typeof value === "string" ? new Date(value) : value);
}

export function isAnonymizedEmail(email: string) {
  return /^removed\+.+@invalid\.local$/i.test(email);
}

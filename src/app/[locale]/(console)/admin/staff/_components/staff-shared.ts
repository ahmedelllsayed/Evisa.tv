import type { Tone } from "@/components/admin/chrome";
import type { AdminRole } from "@/lib/types";

export type StaffMember = {
  id: string;
  email: string;
  fullName: string | null;
  role: AdminRole;
  phone: string | null;
  banned: boolean;
  profile: {
    department: string | null;
    specialty: string[];
    maxApplications: number;
    notes: string | null;
    active: boolean;
    hiredAt: string | null;
  } | null;
  open: number;
  late: number;
  perf: { processed: number; approved: number; rejected: number; avgHours: number } | null;
};

export type StaffAccess = {
  currentUserId: string;
  currentRole: AdminRole;
  canManage: boolean;
  canChangeRole: boolean;
  canAdd: boolean;
  assignable: AdminRole[];
};

export const DEFAULT_MAX = 10;

export function capacity(member: StaffMember) {
  return member.profile?.maxApplications ?? DEFAULT_MAX;
}

export function isActive(member: StaffMember) {
  return !member.banned && (member.profile?.active ?? true);
}

export function loadTone(open: number, max: number): Tone {
  if (max <= 0 || open >= max) return "danger";
  if (open / max >= 0.75) return "warning";
  return "success";
}

export function hours(value: number) {
  if (!value) return "—";
  return value >= 48 ? `${(value / 24).toFixed(1)} يوم` : `${value.toFixed(1)} س`;
}

export function splitSpecialty(value: string) {
  return [...new Set(value.split(/[,،]/).map((item) => item.trim()).filter(Boolean))];
}

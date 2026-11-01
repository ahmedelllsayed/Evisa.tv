// Client-safe role constants (no server imports)
import type { AdminRole } from "@/lib/types";

const ROLES: readonly AdminRole[] = ["super_admin", "admin", "manager", "operator", "support", "viewer", "user"];

export function parseAdminRole(value: unknown): AdminRole {
  const role = String(value ?? "user");
  return (ROLES as readonly string[]).includes(role) ? (role as AdminRole) : "user";
}

export function isAdminRole(value: string): value is AdminRole {
  return (ROLES as readonly string[]).includes(value);
}

export function isStaffRole(role: string | null | undefined): boolean {
  return Boolean(role && role !== "user");
}

export function isFullAdmin(role: string | null | undefined): boolean {
  return role === "admin" || role === "super_admin";
}

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "مدير أعلى",
  admin: "مدير",
  manager: "مشرف",
  operator: "موظف تشغيل",
  support: "دعم فني",
  viewer: "مشاهد",
  user: "مستخدم",
};

export const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  super_admin: "صلاحيات كاملة - إدارة الموظفين والنظام",
  admin: "صلاحيات إدارية كاملة - معالجة وإدارة المحتوى",
  manager: "إدارة الطلبات والمحتوى - بدون حذف المستخدمين",
  operator: "معالجة الطلبات فقط",
  support: "عرض الطلبات والرد على الاستفسارات",
  viewer: "عرض فقط - بدون تعديل",
  user: "مستخدم عادي - بدون صلاحيات إدارية",
};

/**
 * Check if role1 can manage role2 (client-side check)
 * Server-side validation is still required!
 */
export function canManageUser(managerRole: AdminRole, targetRole: AdminRole): boolean {
  if (managerRole === "super_admin") {
    return targetRole !== "super_admin";
  }

  if (managerRole === "admin") {
    return ["manager", "operator", "support", "viewer", "user"].includes(targetRole);
  }

  return false;
}

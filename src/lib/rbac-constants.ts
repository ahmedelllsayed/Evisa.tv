// Client-safe role constants (no server imports)
import type { AdminRole } from "@/lib/types";

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

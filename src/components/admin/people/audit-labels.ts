import type { Tone } from "@/components/admin/chrome";
import { ROLE_LABELS, isAdminRole } from "@/lib/rbac-constants";

const actionLabels: Record<string, string> = {
  "settings.save": "حفظ إعدادات الموقع",
  "payment.refund": "استرداد مبلغ",
  "payment.refunded": "استرداد مبلغ",
  "user.role": "تغيير دور مستخدم",
  "user.role_updated": "تغيير دور مستخدم",
  "user.anonymize": "حذف حساب وإخفاء بياناته",
  "user.ban": "حظر مستخدم",
  "user.unban": "إلغاء حظر مستخدم",
  "user.create": "إنشاء حساب",
  "user.update": "تعديل بيانات حساب",
  "message.reply": "رد على رسالة",
  "message.delete": "حذف رسالة",
  "application.checks": "تحديث قائمة التحقق",
  "application.mail": "إرسال بريد للعميل",
  "application.status": "تغيير حالة طلب",
  "application.status_changed": "تغيير حالة طلب",
  "application.assign": "تعيين مسؤول للطلب",
  "application.assignee_changed": "تغيير مسؤول الطلب",
  "applications.bulk_assigned": "تعيين طلبات بالجملة",
  "traveler.update": "تعديل بيانات مسافر",
  "document.reject": "رفض مستند",
  "document.approve": "قبول مستند",
  "document.status_changed": "تغيير حالة مستند",
  "document.delete": "حذف مستند",
  "staff.created": "إضافة موظف",
  "staff.profile_updated": "تعديل ملف موظف",
  "staff.removed": "إزالة موظف من الفريق",
  "destination.save": "حفظ وجهة",
  "destination.delete": "حذف وجهة",
  "fee.change": "تغيير رسوم",
  "page.save": "حفظ صفحة",
  "page.publish": "نشر صفحة",
};

const groupLabels: Record<string, string> = {
  settings: "الإعدادات",
  payment: "المدفوعات",
  user: "المستخدمون",
  message: "الرسائل",
  application: "الطلبات",
  applications: "الطلبات",
  traveler: "المسافرون",
  document: "المستندات",
  staff: "الموظفون",
  destination: "الوجهات",
  fee: "الرسوم",
  page: "الصفحات",
  faq: "الأسئلة الشائعة",
  review: "التقييمات",
  event: "الفعاليات",
  holiday: "العطلات",
};

const groupTones: Record<string, Tone> = {
  settings: "info",
  payment: "warning",
  user: "danger",
  staff: "danger",
  message: "success",
  document: "info",
  application: "info",
  applications: "info",
};

const verbs: Record<string, string> = {
  save: "حفظ",
  create: "إنشاء",
  created: "إنشاء",
  update: "تعديل",
  updated: "تعديل",
  delete: "حذف",
  deleted: "حذف",
  remove: "إزالة",
  removed: "إزالة",
  publish: "نشر",
  reject: "رفض",
  approve: "قبول",
};

export function auditGroup(action: string) {
  return action.split(".")[0] ?? action;
}

export function auditGroupLabel(prefix: string) {
  return groupLabels[prefix] ?? prefix;
}

export function auditTone(action: string): Tone {
  return groupTones[auditGroup(action)] ?? "neutral";
}

export function auditLabel(action: string) {
  if (actionLabels[action]) return actionLabels[action];
  const [prefix, verb] = action.split(".");
  const group = groupLabels[prefix ?? ""];
  const doing = verbs[verb ?? ""];
  if (group && doing) return `${doing} · ${group}`;
  return action;
}

const detailKeys: Record<string, string> = {
  oldRole: "من",
  newRole: "إلى",
  role: "الدور",
  department: "القسم",
  specialty: "التخصص",
  maxApplications: "الحد الأقصى",
  active: "نشط",
  notes: "ملاحظات",
  assigneeId: "المسؤول",
  count: "العدد",
  hiredAt: "تاريخ التعيين",
};

function detailValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  if (Array.isArray(value)) return value.length ? value.map(detailValue).join("، ") : "—";
  if (typeof value === "string" && isAdminRole(value)) return ROLE_LABELS[value];
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Turns stored detail (plain text or a JSON object) into a short readable line. */
export function auditDetail(action: string, detail: string | null) {
  if (!detail) return null;
  const text = detail.trim();
  if (text.startsWith("{")) {
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      const parts = Object.entries(parsed)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${detailKeys[key] ?? key}: ${detailValue(value)}`);
      return parts.length ? parts.join(" · ") : null;
    } catch {
      return text;
    }
  }
  if (isAdminRole(text)) return `الدور الجديد: ${ROLE_LABELS[text]}`;
  if (action.startsWith("payment.") && text === "full") return "استرداد كامل";
  if (action.startsWith("payment.") && /^\d+(\.\d+)?$/.test(text)) return `المبلغ: ${Number(text).toLocaleString("en-US")} EGP`;
  return text;
}

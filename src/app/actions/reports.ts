"use server";

import { redirect } from "next/navigation";
import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { getInsights, insightSheets } from "@/lib/data/insights";
import { sendMail } from "@/lib/email";
import { buildCsv } from "@/lib/reports/xlsx";
import { currentUserHasPermission } from "@/lib/rbac";

export async function emailReport(locale: string, days: number) {
  const user = await requireAdmin(locale);
  if (!(await currentUserHasPermission("reports", "export")) && user.role !== "super_admin" && user.role !== "admin") {
    redirect(`/${locale}/admin/reports?days=${days}`);
  }
  const actor = await getCurrentUser();
  if (!actor?.email) redirect(`/${locale}/admin/reports?days=${days}`);
  const data = await getInsights(days);
  const csv = buildCsv(insightSheets(data).flatMap((sheet) => [[sheet.name], ...sheet.rows, []]));
  const mailed = await sendMail({
    to: actor.email,
    subject: `تقرير التشغيل لآخر ${days} يوماً`,
    text: "مرفق تقرير الإيرادات والتشغيل والموظفين والجودة.",
    attachments: [{ filename: `report-${days}d.csv`, content: Buffer.from(csv), contentType: "text/csv" }],
  });
  redirect(`/${locale}/admin/reports?days=${days}&sent=${mailed.sent ? "1" : "0"}`);
}

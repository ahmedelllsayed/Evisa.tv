import Link from "next/link";
import { adminCreateQuestionSet } from "@/app/actions/questions";
import { AdminCard, AdminPage, adminPrimaryClass, adminTdClass, adminThClass, adminTrClass } from "@/components/admin/chrome";
import { requireAdmin } from "@/lib/auth";
import { listQuestionSets } from "@/lib/data/questions";
import { href } from "@/lib/href";
import type { Page } from "@/lib/page";

export const metadata = { title: "Question sets" };

export default async function AdminQuestionsPage({ params }: Page) {
  const { locale } = await params;
  await requireAdmin(locale);
  const sets = await listQuestionSets();
  return (
    <AdminPage
      title="أسئلة الطلب"
      description="مجموعات أسئلة تُربط بدولة أو بنوع تأشيرة أو بمنتج محدد. إن لم يوجد ربط، يبقى طلب العميل على الخطوات الحالية."
      action={
        <form action={adminCreateQuestionSet.bind(null, locale)}>
          <button className={adminPrimaryClass}>مجموعة جديدة</button>
        </form>
      }
    >
      <AdminCard className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className={adminThClass}>المجموعة</th>
              <th className={adminThClass}>الأسئلة</th>
              <th className={adminThClass}>الربط</th>
              <th className={adminThClass}>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {sets.map((set) => (
              <tr key={set.id} className={adminTrClass}>
                <td className={adminTdClass}>
                  <Link href={href(`/admin/questions/${set.id}`, locale)} className="font-medium text-brand">
                    {set.nameAr || set.name}
                  </Link>
                  <p className="text-xs text-muted-ink" dir="ltr">
                    {set.name}
                  </p>
                </td>
                <td className={adminTdClass}>{set.questionCount}</td>
                <td className={adminTdClass}>{set.assignmentCount}</td>
                <td className={adminTdClass}>{set.isActive ? "مفعّلة" : "متوقفة"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sets.length === 0 ? <p className="px-4 py-8 text-center text-sm text-muted-foreground">لا توجد مجموعات بعد.</p> : null}
      </AdminCard>
    </AdminPage>
  );
}

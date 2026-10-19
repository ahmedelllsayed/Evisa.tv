const steps: Record<string, { en: string; ar: string }> = {
  draft: {
    en: "Finish the travellers and documents, then pay. Nothing is sent to an authority.",
    ar: "أكمل المسافرين والمستندات ثم ادفع. لا يُرسل شيء إلى أي جهة.",
  },
  payment_pending: {
    en: "The payment is not finished. Complete it to keep the target date.",
    ar: "الدفع لم يكتمل. أكمله للإبقاء على الموعد المستهدف.",
  },
  submitted: {
    en: "A staff member will review the file. Nothing is sent to an authority automatically.",
    ar: "سيراجع أحد الموظفين الملف. لا يُرسل شيء إلى أي جهة تلقائياً.",
  },
  in_review: {
    en: "Staff are checking the file. The next update appears here.",
    ar: "يراجع الفريق الملف. التحديث التالي يظهر هنا.",
  },
  filed: {
    en: "A staff member is filing this application by hand.",
    ar: "يقدّم أحد الموظفين هذا الطلب يدوياً.",
  },
  approved: {
    en: "The visa was approved. The file is in this page when we attach it.",
    ar: "تمت الموافقة. ملف التأشيرة يظهر في هذه الصفحة عند إرفاقه.",
  },
  rejected: {
    en: "The application was refused. The note from the team is in the timeline.",
    ar: "رُفض الطلب. ملاحظة الفريق في سجل التحديثات.",
  },
  cancelled: {
    en: "This application was cancelled.",
    ar: "أُلغي هذا الطلب.",
  },
  refunded: {
    en: "The payment for this application was refunded.",
    ar: "أُعيد مبلغ هذا الطلب.",
  },
};

export function nextStepText(status: string, arabic: boolean) {
  const row = steps[status];
  if (!row) return "";
  return arabic ? row.ar : row.en;
}

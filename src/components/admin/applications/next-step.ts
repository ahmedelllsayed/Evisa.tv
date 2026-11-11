import type { Tone } from "@/components/admin/chrome";
import type { DocGap } from "@/lib/application-rules";
import type { Application, ApplicationStatus } from "@/lib/types";
import type { Sla } from "./model";

export type DetailTab = "documents" | "travelers" | "answers" | "payment" | "issued" | "activity";

export type StepAction =
  | { kind: "tab"; tab: DetailTab; label: string }
  | { kind: "status"; status: ApplicationStatus; label: string }
  | { kind: "panel"; target: "assign" | "follow-up"; label: string };

export type NextStep = { tone: Tone; title: string; detail: string; action?: StepAction };

export function nextStep(input: {
  app: Application;
  sla: Sla;
  waitingReview: number;
  gaps: DocGap[];
  readyToFile: boolean;
  issuedCount: number;
  paymentReview: boolean;
  refund: { status: string; reason: string } | null;
}): { primary: NextStep; also: NextStep[] } {
  const { app, sla, waitingReview, gaps, readyToFile, issuedCount, paymentReview, refund } = input;
  const rejected = gaps.filter((gap) => gap.reason === "rejected").length;
  const missing = gaps.length - rejected;
  const open = ["submitted", "in_review", "filed"].includes(app.status);
  const also: NextStep[] = [];

  if (open && !app.assigneeId) {
    also.push({ tone: "warning", title: "لا يوجد مسؤول", detail: "عيّن موظفاً يتابع الطلب حتى النهاية.", action: { kind: "panel", target: "assign", label: "تعيين" } });
  }
  if (sla.state === "late") also.push({ tone: "danger", title: sla.label, detail: "تجاوز الطلب الموعد المضمون للعميل." });
  if (paymentReview && app.status !== "refunded") {
    also.push({ tone: "danger", title: "دفعة تحتاج مراجعة", detail: "سجّل Paymob عملية لا تطابق الطلب.", action: { kind: "tab", tab: "payment", label: "تبويب الدفع" } });
  }
  if (refund?.status === "open") {
    also.push({ tone: "warning", title: "طلب استرداد مفتوح", detail: refund.reason || "العميل طلب استرداد المبلغ.", action: { kind: "tab", tab: "payment", label: "تبويب الدفع" } });
  }

  const pick = (primary: NextStep) => ({ primary, also: also.filter((item) => item.title !== primary.title) });

  switch (app.status) {
    case "refunded":
      return pick({ tone: "neutral", title: "الطلب مسترد", detail: "أُعيد المبلغ للعميل وأُغلق الطلب. لا إجراء مطلوب." });
    case "cancelled":
      return pick({ tone: "neutral", title: "الطلب ملغى", detail: "الطلب مغلق. لا إجراء مطلوب." });
    case "draft":
      return pick({
        tone: "neutral",
        title: "العميل لم يُكمل الطلب",
        detail: "المسودات لا تُراجع. إن طال انتظارها أرسل تذكيراً بإكمال الطلب.",
        action: { kind: "panel", target: "follow-up", label: "إرسال تذكير" },
      });
    case "payment_pending":
      return pick({
        tone: "warning",
        title: "بانتظار الدفع",
        detail: "بدأ العميل الدفع ولم يكتمل. المهلة لا تبدأ قبل الدفع.",
        action: { kind: "panel", target: "follow-up", label: "تذكير بإكمال الطلب" },
      });
    case "rejected":
      return pick({
        tone: "danger",
        title: "رفضت الجهة الطلب",
        detail: "إن قدّم العميل ما يغيّر القرار، أعد فتحه للمراجعة.",
        action: { kind: "status", status: "in_review", label: "إعادة فتح للمراجعة" },
      });
    case "approved":
      return issuedCount
        ? pick({
            tone: "success",
            title: "مكتمل",
            detail: `أُرسلت التأشيرة للعميل (${issuedCount} ${issuedCount === 1 ? "ملف" : "ملفات"}). يمكنك طلب تقييم.`,
            action: { kind: "panel", target: "follow-up", label: "طلب تقييم" },
          })
        : pick({
            tone: "warning",
            title: "ارفع التأشيرة الصادرة",
            detail: "الطلب موافق عليه ولم يستلم العميل ملف التأشيرة بعد.",
            action: { kind: "tab", tab: "issued", label: "رفع التأشيرة" },
          });
  }

  if (paymentReview) return pick(also.find((item) => item.title === "دفعة تحتاج مراجعة")!);
  if (app.status === "filed") {
    if (gaps.length || waitingReview) {
      also.push({ tone: "info", title: "مستندات غير مكتملة", detail: "قُدّم الطلب وما زال فيه مستند ناقص أو غير معتمد.", action: { kind: "tab", tab: "documents", label: "المستندات" } });
    }
    return pick({
      tone: "info",
      title: "بانتظار قرار الجهة",
      detail: "قُدّم الطلب للجهة. سجّل النتيجة فور وصولها ليُبلَّغ العميل.",
      action: { kind: "status", status: "approved", label: "تسجيل الموافقة" },
    });
  }
  if (waitingReview) {
    if (app.status === "submitted") {
      also.push({ tone: "info", title: "ما زال «مقدّم»", detail: "انقله إلى «قيد المراجعة» ليرى العميل أنكم بدأتم.", action: { kind: "status", status: "in_review", label: "نقل للمراجعة" } });
    }
    return pick({
      tone: "warning",
      title: `راجع ${waitingReview} ${waitingReview === 1 ? "مستند" : "مستندات"}`,
      detail: "رفعها العميل وتنتظر قبولك أو رفضك مع ذكر السبب.",
      action: { kind: "tab", tab: "documents", label: "مراجعة المستندات" },
    });
  }
  if (gaps.length) {
    const parts = [rejected ? `${rejected} مرفوض ينتظر بديلاً` : "", missing ? `${missing} لم يُرفع` : ""].filter(Boolean).join("، ");
    return pick({
      tone: "info",
      title: "بانتظار مستندات العميل",
      detail: `${parts}. لا يمكن التقديم للجهة قبل اكتمالها.`,
      action: { kind: "panel", target: "follow-up", label: "تذكير بالمستندات" },
    });
  }
  if (readyToFile) {
    return pick({
      tone: "success",
      title: "جاهز للتقديم",
      detail: "كل المستندات المطلوبة معتمدة. قدّم الطلب للجهة ثم سجّل ذلك.",
      action: { kind: "status", status: "filed", label: "نقل إلى «مُرسل للجهة»" },
    });
  }
  return pick({
    tone: "info",
    title: "ابدأ المراجعة",
    detail: "راجع بيانات المسافرين ومستنداتهم.",
    action: app.status === "submitted" ? { kind: "status", status: "in_review", label: "نقل للمراجعة" } : { kind: "tab", tab: "documents", label: "المستندات" },
  });
}

import { isArabicLocale } from "@/lib/i18n";
import { linesOf } from "@/lib/cms/registry";
import type { Faq } from "@/lib/types";

/**
 * The seeded refund FAQs were stored without Arabic. Until an editor adds a translation,
 * these keep the Arabic page in Arabic. Keys are the seeded English questions.
 */
const seededArabic: Record<string, { q: string; a: string }> = {
  "do you give refunds?": {
    q: "هل تقدّمون استرداداً؟",
    a: "يمكنك طلب استرداد من حسابك قبل تعليم الطلب كمقدَّم. يوافق الموظف أو يرفض. لا يوجد استرداد تلقائي.",
  },
  "do i get a refund if my visa is rejected?": {
    q: "هل أسترد المبلغ إذا رُفضت التأشيرة؟",
    a: "الرفض وحده لا يعيد رسم الجهة ولا رسم الخدمة. اطلب مراجعة من حسابك، والفريق يقرر.",
  },
  "can i get a refund if i cancel my application?": {
    q: "هل أسترد المبلغ إذا ألغيت طلبي؟",
    a: "اطلب الاسترداد من حسابك قبل تعليم الطلب كمقدَّم. لا يوجد رصيد فوري في الحساب. بعد أن يعلّم موظف الملف كمقدَّم، لا يُرد الرسم من هذا الموقع.",
  },
  "what if you cancel my application?": {
    q: "ماذا لو ألغينا نحن طلبك؟",
    a: "إذا ألغينا الطلب قبل تعليمه كمقدَّم، يمكنك طلب الاسترداد، ويعيد أحد الموظفين المبلغ إلى البطاقة.",
  },
  "how long does a refund take?": {
    q: "كم يستغرق الاسترداد؟",
    a: "بعد موافقة الموظف، يعتمد رد المبلغ إلى البطاقة على مزود الدفع، وقد يستغرق عدة أيام عمل. لا يُضاف رصيد فوري داخل الحساب.",
  },
  "are there hidden fees?": {
    q: "هل توجد رسوم خفية؟",
    a: "لا. تدفع رسم الجهة مع رسم الخدمة، وكلاهما ظاهر قبل الدفع.",
  },
};

/** FAQ entries in the page language. An entry with no text in that language is skipped rather than shown in English. */
export function refundFaqItems(faqs: Faq[], fallbackLines: string | undefined, locale: string) {
  const arabic = isArabicLocale(locale);
  const items = faqs.flatMap((faq) => {
    if (!arabic) return [{ q: faq.question, a: faq.answer }];
    if (faq.questionAr && faq.answerAr) return [{ q: faq.questionAr, a: faq.answerAr }];
    const seeded = seededArabic[faq.question.trim().toLowerCase()];
    return seeded ? [seeded] : [];
  });
  if (items.length) return items;
  return linesOf(fallbackLines)
    .filter((parts) => parts[0] && parts[1])
    .map((parts) => ({ q: parts[0]!, a: parts.slice(1).join(" | ") }));
}

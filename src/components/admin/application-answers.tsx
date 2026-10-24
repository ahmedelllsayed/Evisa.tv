"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminAddApplicationQuestion, adminRemoveApplicationQuestion } from "@/app/actions/questions";
import { AdminCard, adminGhostClass, adminInputClass, adminPrimaryClass, adminTextareaClass } from "@/components/admin/chrome";
import { formatAnswer, slugKey, storedFileHref, type AnswerValue, type Question, type QuestionType } from "@/lib/questions";

const typeLabels: Record<QuestionType, string> = {
  short_text: "نص قصير",
  long_text: "نص طويل",
  yes_no: "نعم / لا",
  single_choice: "اختيار واحد",
  multiple_choice: "اختيار متعدد",
  date: "تاريخ",
  number: "رقم",
  file: "ملف",
};

export function ApplicationAnswers({
  locale,
  applicationId,
  reference,
  questions,
  answers,
  missingIds,
}: {
  locale: string;
  applicationId: string;
  reference: string;
  questions: Question[];
  answers: AnswerValue[];
  missingIds: string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [labelAr, setLabelAr] = useState("");
  const [helpText, setHelpText] = useState("");
  const [helpTextAr, setHelpTextAr] = useState("");
  const [type, setType] = useState<QuestionType>("short_text");
  const [required, setRequired] = useState(true);
  const [optionsText, setOptionsText] = useState("Option A | خيار أ\nOption B | خيار ب");
  const [showKey, setShowKey] = useState("");
  const [equals, setEquals] = useState("yes");
  const missing = new Set(missingIds);
  const byId = new Map(answers.map((answer) => [answer.questionId, answer]));

  return (
    <AdminCard>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">إجابات الأسئلة</h2>
        <a className={adminGhostClass} href={`/api/admin/applications/${applicationId}/answers.csv`}>
          تصدير CSV
        </a>
      </div>
      <p className="mt-1 text-xs text-muted-ink">ملف {reference}. الأسئلة الخاصة بهذا الطلب تظهر للعميل مع مجموعة الدولة.</p>
      {questions.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">لا توجد أسئلة لهذا الطلب.</p> : null}
      <ul className="mt-4 space-y-3">
        {questions.map((question) => {
          const answer = byId.get(question.id);
          const value = formatAnswer(question, answer, "ar-EG");
          return (
            <li key={question.id} className="rounded-xl border border-line px-4 py-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-medium">
                  {question.labelAr || question.label}
                  {question.required ? <span className="text-red-600"> *</span> : null}
                  {question.applicationId ? <span className="ms-2 text-xs font-normal text-muted-ink">خاص بهذا الطلب</span> : null}
                  {!question.isActive ? <span className="ms-2 text-xs font-normal text-muted-ink">مؤرشف</span> : null}
                </p>
                {missing.has(question.id) ? <span className="text-xs text-red-600">ناقص</span> : null}
              </div>
              <p className="text-xs text-muted-ink" dir="ltr">
                {question.label}
              </p>
              {question.type === "file" && answer?.filePath ? (
                <a href={storedFileHref(answer.filePath)} className="mt-1 block text-brand" target="_blank" rel="noreferrer">
                  {answer.fileName}
                </a>
              ) : (
                <p className="mt-1">{value || "—"}</p>
              )}
              {question.applicationId && question.isActive ? (
                <button
                  type="button"
                  className="mt-2 text-xs text-red-600"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      await adminRemoveApplicationQuestion(locale, applicationId, question.id);
                      router.refresh();
                    })
                  }
                >
                  إزالة السؤال
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>

      <form
        className="mt-6 grid gap-3 border-t pt-4 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          const choice = type === "single_choice" || type === "multiple_choice";
            const taken = new Set<string>();
            const options = choice
            ? optionsText
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line) => {
                  const [english, arabic] = line.split("|").map((part) => part.trim());
                  const value = slugKey(english || "option", taken);
                  taken.add(value);
                  return { value, label: english || value, labelAr: arabic || "" };
                })
            : [];
          if (choice && options.length < 2) {
            setError("أضف خيارين على الأقل بصيغة: English | العربية");
            return;
          }
          const key = slugKey(label, new Set(questions.map((question) => question.key)));
          start(async () => {
            const result = await adminAddApplicationQuestion(locale, applicationId, {
              id: crypto.randomUUID(),
              key,
              type,
              label,
              labelAr,
              helpText,
              helpTextAr,
              required,
              sortOrder: 2000,
              options,
              showIf: showKey ? { questionKey: showKey, equals: equals.trim() || "yes" } : null,
            });
            if (!result.ok) setError(result.error);
            else {
              setLabel("");
              setLabelAr("");
              setHelpText("");
              setHelpTextAr("");
              router.refresh();
            }
          });
        }}
      >
        <h3 className="font-medium md:col-span-2">سؤال إضافي لهذا العميل</h3>
        <label className="text-sm">
          السؤال بالإنجليزية
          <input required value={label} dir="ltr" onChange={(event) => setLabel(event.target.value)} className={adminInputClass} />
        </label>
        <label className="text-sm">
          السؤال بالعربية
          <input required value={labelAr} dir="rtl" onChange={(event) => setLabelAr(event.target.value)} className={adminInputClass} />
        </label>
        <label className="text-sm">
          مساعدة بالإنجليزية
          <input value={helpText} dir="ltr" onChange={(event) => setHelpText(event.target.value)} className={adminInputClass} />
        </label>
        <label className="text-sm">
          مساعدة بالعربية
          <input value={helpTextAr} dir="rtl" onChange={(event) => setHelpTextAr(event.target.value)} className={adminInputClass} />
        </label>
        <label className="text-sm">
          النوع
          <select value={type} onChange={(event) => setType(event.target.value as QuestionType)} className={adminInputClass}>
            {(Object.keys(typeLabels) as QuestionType[]).map((item) => (
              <option key={item} value={item}>
                {typeLabels[item]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} />
          مطلوب
        </label>
        {type === "single_choice" || type === "multiple_choice" ? (
          <label className="text-sm md:col-span-2">
            الخيارات، سطر لكل خيار: English | العربية
            <textarea value={optionsText} dir="ltr" onChange={(event) => setOptionsText(event.target.value)} className={adminTextareaClass} />
          </label>
        ) : null}
        <label className="text-sm">
          يظهر إذا كان مفتاح السؤال
          <select value={showKey} onChange={(event) => setShowKey(event.target.value)} className={adminInputClass}>
            <option value="">دائماً</option>
            {questions.filter((question) => question.isActive).map((question) => (
              <option key={question.id} value={question.key}>
                {question.key}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          يساوي
          <input value={equals} dir="ltr" onChange={(event) => setEquals(event.target.value)} className={adminInputClass} />
        </label>
        {error ? <p className="text-sm text-red-600 md:col-span-2">{error}</p> : null}
        <button disabled={pending} className={`${adminPrimaryClass} md:col-span-2`}>
          إرسال السؤال للعميل
        </button>
      </form>
    </AdminCard>
  );
}

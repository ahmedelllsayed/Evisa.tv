"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminDeleteQuestionSet, adminSaveQuestionSet } from "@/app/actions/questions";
import { AdminCard, AdminPage, adminDangerClass, adminGhostClass, adminInputClass, adminPrimaryClass, adminTextareaClass } from "@/components/admin/chrome";
import {
  SCHENGEN_COUNTRY_CODES,
  assignmentScopeKey,
  slugKey,
  type AssignmentDraft,
  type Question,
  type QuestionDraft,
  type QuestionOption,
  type QuestionType,
} from "@/lib/questions";

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

const visaTypeLabels: { value: string; label: string }[] = [
  { value: "", label: "كل الأنواع في هذه الدولة" },
  { value: "sticker", label: "تأشيرة ملصقة" },
  { value: "e-visa", label: "تأشيرة إلكترونية" },
  { value: "eta", label: "تصريح سفر" },
  { value: "visa-free", label: "بدون تأشيرة" },
];

type DestinationChoice = { id: string; code: string; name: string; visaType: string };
type OptionChoice = { id: string; destinationId: string; label: string; visaType: string };

export function QuestionSetEditor({
  locale,
  questionSet,
  destinations,
  options,
}: {
  locale: string;
  questionSet: {
    id: string;
    name: string;
    nameAr: string | null;
    description: string | null;
    descriptionAr: string | null;
    isActive: boolean;
    questions: Question[];
    assignments: (AssignmentDraft & { id: string; destinationName: string; destinationCode: string; optionLabel: string | null })[];
  };
  destinations: DestinationChoice[];
  options: OptionChoice[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [name, setName] = useState(questionSet.name);
  const [nameAr, setNameAr] = useState(questionSet.nameAr ?? "");
  const [description, setDescription] = useState(questionSet.description ?? "");
  const [descriptionAr, setDescriptionAr] = useState(questionSet.descriptionAr ?? "");
  const [isActive, setIsActive] = useState(questionSet.isActive);
  const [questions, setQuestions] = useState<QuestionDraft[]>(() => questionSet.questions.filter((question) => question.isActive).map(toDraft));
  const [assignments, setAssignments] = useState<AssignmentDraft[]>(() =>
    questionSet.assignments.map((assignment) => ({
      destinationId: assignment.destinationId,
      visaOptionId: assignment.visaOptionId,
      visaType: assignment.visaType,
    })),
  );

  function updateQuestion(id: string, patch: (question: QuestionDraft) => QuestionDraft) {
    setQuestions((current) => current.map((question) => (question.id === id ? patch(question) : question)));
  }

  function save() {
    setError(null);
    setNotice(null);
    start(async () => {
      const result = await adminSaveQuestionSet(locale, questionSet.id, {
        name,
        nameAr,
        description,
        descriptionAr,
        isActive,
        questions: questions.map((question, index) => ({ ...question, sortOrder: (index + 1) * 10 })),
        assignments,
      });
      if (!result.ok) setError(result.error);
      else {
        setNotice("تم الحفظ.");
        router.refresh();
      }
    });
  }

  return (
    <AdminPage
      title={nameAr || name || "مجموعة أسئلة"}
      description="يُستخدم أدق ربط متاح: منتج التأشيرة، ثم نوع التأشيرة داخل الدولة، ثم الدولة كلها. الطلبات بلا ربط تبقى على الخطوات الحالية."
      action={
        <button type="button" disabled={pending} className={adminPrimaryClass} onClick={save}>
          حفظ
        </button>
      }
    >
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p> : null}
      <AdminCard className="grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          الاسم بالإنجليزية
          <input value={name} onChange={(event) => setName(event.target.value)} className={adminInputClass} dir="ltr" />
        </label>
        <label className="text-sm">
          الاسم بالعربية
          <input value={nameAr} onChange={(event) => setNameAr(event.target.value)} className={adminInputClass} dir="rtl" />
        </label>
        <label className="text-sm">
          وصف داخلي بالإنجليزية
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} className={adminTextareaClass} dir="ltr" />
        </label>
        <label className="text-sm">
          وصف داخلي بالعربية
          <textarea value={descriptionAr} onChange={(event) => setDescriptionAr(event.target.value)} className={adminTextareaClass} dir="rtl" />
        </label>
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
          المجموعة مفعّلة وتظهر للعملاء
        </label>
      </AdminCard>

      <AdminCard>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">الربط بالوجهات</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={adminGhostClass}
              onClick={() => {
                const codes = new Set<string>(SCHENGEN_COUNTRY_CODES);
                const hits = destinations.filter(
                  (destination) =>
                    codes.has(destination.code.trim().toUpperCase()) &&
                    (destination.visaType === "sticker" || options.some((option) => option.destinationId === destination.id && option.visaType === "sticker")),
                );
                if (!hits.length) {
                  setNotice("لا توجد وجهات شنغن بتأشيرة ملصقة في الكتالوج. أضف الدولة، مثل إسبانيا أو هولندا أو اليونان، ثم اربطها من هنا.");
                  return;
                }
                setAssignments((current) => {
                  const next = [...current];
                  for (const destination of hits) {
                    const row = { destinationId: destination.id, visaOptionId: null, visaType: "sticker" };
                    if (!next.some((item) => assignmentScopeKey(item) === assignmentScopeKey(row))) next.push(row);
                  }
                  return next;
                });
                setNotice(`أُضيف ربط التأشيرة الملصقة لـ ${hits.length} وجهة شنغن. احفظ لتثبيته.`);
              }}
            >
              ربط شنغن الملصقة
            </button>
            <button
              type="button"
              className={adminGhostClass}
              onClick={() => {
                const destination = destinations[0];
                if (!destination) {
                  setError("لا توجد وجهات في الكتالوج.");
                  return;
                }
                setAssignments((current) => [...current, { destinationId: destination.id, visaOptionId: null, visaType: null }]);
              }}
            >
              إضافة ربط
            </button>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {assignments.length === 0 ? <p className="text-sm text-muted-foreground">غير مربوطة بعد. العملاء لن يروا هذه الأسئلة.</p> : null}
          {assignments.map((assignment, index) => {
            const destinationOptions = options.filter((option) => option.destinationId === assignment.destinationId);
            return (
              <div key={`${assignment.destinationId}-${index}`} className="grid gap-2 rounded-lg border p-3 md:grid-cols-[1.4fr_1fr_1.2fr_auto]">
                <select
                  value={assignment.destinationId}
                  className={adminInputClass}
                  onChange={(event) =>
                    setAssignments((current) => current.map((item, itemIndex) => (itemIndex === index ? { destinationId: event.target.value, visaOptionId: null, visaType: item.visaType } : item)))
                  }
                >
                  {destinations.map((destination) => (
                    <option key={destination.id} value={destination.id}>
                      {destination.name} · {destination.code}
                    </option>
                  ))}
                </select>
                <select
                  value={assignment.visaType ?? ""}
                  disabled={Boolean(assignment.visaOptionId)}
                  className={adminInputClass}
                  onChange={(event) =>
                    setAssignments((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, visaType: event.target.value || null, visaOptionId: null } : item,
                      ),
                    )
                  }
                >
                  {visaTypeLabels.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <select
                  value={assignment.visaOptionId ?? ""}
                  className={adminInputClass}
                  onChange={(event) =>
                    setAssignments((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, visaOptionId: event.target.value || null, visaType: event.target.value ? null : item.visaType } : item,
                      ),
                    )
                  }
                >
                  <option value="">كل منتجات هذه الوجهة</option>
                  {destinationOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label} · {option.visaType}
                    </option>
                  ))}
                </select>
                <button type="button" className={adminDangerClass} onClick={() => setAssignments((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                  إزالة
                </button>
              </div>
            );
          })}
        </div>
      </AdminCard>

      <div className="space-y-3">
        {questions.map((question, index) => (
          <AdminCard key={question.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">سؤال {index + 1}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={adminGhostClass} disabled={index === 0} onClick={() => move(index, -1)}>
                  أعلى
                </button>
                <button type="button" className={adminGhostClass} disabled={index === questions.length - 1} onClick={() => move(index, 1)}>
                  أسفل
                </button>
                <button
                  type="button"
                  className={adminDangerClass}
                  onClick={() =>
                    setQuestions((current) =>
                      current
                        .filter((item) => item.id !== question.id)
                        .map((item) => (item.showIf?.questionKey === question.key ? { ...item, showIf: null } : item)),
                    )
                  }
                >
                  حذف
                </button>
              </div>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="text-sm">
                السؤال بالإنجليزية
                <input
                  value={question.label}
                  dir="ltr"
                  className={adminInputClass}
                  onChange={(event) => updateQuestion(question.id, (item) => ({ ...item, label: event.target.value }))}
                  onBlur={() => {
                    if (!/^question(_\d+)?$/.test(question.key)) return;
                    const taken = new Set(questions.filter((item) => item.id !== question.id).map((item) => item.key));
                    updateQuestion(question.id, (item) => ({ ...item, key: slugKey(item.label, taken) }));
                  }}
                />
              </label>
              <label className="text-sm">
                السؤال بالعربية
                <input value={question.labelAr} dir="rtl" className={adminInputClass} onChange={(event) => updateQuestion(question.id, (item) => ({ ...item, labelAr: event.target.value }))} />
              </label>
              <label className="text-sm">
                مساعدة بالإنجليزية
                <input value={question.helpText} dir="ltr" className={adminInputClass} onChange={(event) => updateQuestion(question.id, (item) => ({ ...item, helpText: event.target.value }))} />
              </label>
              <label className="text-sm">
                مساعدة بالعربية
                <input value={question.helpTextAr} dir="rtl" className={adminInputClass} onChange={(event) => updateQuestion(question.id, (item) => ({ ...item, helpTextAr: event.target.value }))} />
              </label>
              <label className="text-sm">
                النوع
                <select
                  value={question.type}
                  className={adminInputClass}
                  onChange={(event) => {
                    const type = event.target.value as QuestionType;
                    updateQuestion(question.id, (item) => ({
                      ...item,
                      type,
                      options: type === "single_choice" || type === "multiple_choice" ? item.options.length ? item.options : defaultOptions() : [],
                    }));
                  }}
                >
                  {(Object.keys(typeLabels) as QuestionType[]).map((type) => (
                    <option key={type} value={type}>
                      {typeLabels[type]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                المفتاح
                <input value={question.key} dir="ltr" className={adminInputClass} onChange={(event) => updateQuestion(question.id, (item) => ({ ...item, key: event.target.value.trim() }))} />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={question.required} onChange={(event) => updateQuestion(question.id, (item) => ({ ...item, required: event.target.checked }))} />
                مطلوب
              </label>
              <ConditionFields question={question} questions={questions} onChange={(showIf) => updateQuestion(question.id, (item) => ({ ...item, showIf }))} />
            </div>
            {question.type === "single_choice" || question.type === "multiple_choice" ? (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-medium">الخيارات</p>
                {question.options.map((option, optionIndex) => (
                  <div key={`${question.id}-${optionIndex}`} className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
                    <input
                      value={option.value}
                      dir="ltr"
                      placeholder="value"
                      className={adminInputClass}
                      onChange={(event) => replaceOption(question.id, optionIndex, { ...option, value: event.target.value.trim() })}
                    />
                    <input
                      value={option.label}
                      dir="ltr"
                      placeholder="English"
                      className={adminInputClass}
                      onChange={(event) => replaceOption(question.id, optionIndex, { ...option, label: event.target.value })}
                    />
                    <input
                      value={option.labelAr}
                      dir="rtl"
                      placeholder="العربية"
                      className={adminInputClass}
                      onChange={(event) => replaceOption(question.id, optionIndex, { ...option, labelAr: event.target.value })}
                    />
                    <button
                      type="button"
                      className={adminDangerClass}
                      onClick={() => updateQuestion(question.id, (item) => ({ ...item, options: item.options.filter((_, itemIndex) => itemIndex !== optionIndex) }))}
                    >
                      حذف
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className={adminGhostClass}
                  onClick={() =>
                    updateQuestion(question.id, (item) => ({
                      ...item,
                      options: [...item.options, { value: `option_${item.options.length + 1}`, label: "", labelAr: "" }],
                    }))
                  }
                >
                  خيار
                </button>
              </div>
            ) : null}
          </AdminCard>
        ))}
        <button
          type="button"
          className={adminGhostClass}
          onClick={() =>
            setQuestions((current) => [
              ...current,
              {
                id: crypto.randomUUID(),
                key: slugKey("question", new Set(current.map((question) => question.key))),
                type: "short_text",
                label: "",
                labelAr: "",
                helpText: "",
                helpTextAr: "",
                required: false,
                sortOrder: (current.length + 1) * 10,
                options: [],
                showIf: null,
              },
            ])
          }
        >
          إضافة سؤال
        </button>
      </div>

      <button
        type="button"
        className={adminDangerClass}
        disabled={pending}
        onClick={() => {
          if (!window.confirm("حذف المجموعة يحذف أسئلتها وإجابات العملاء المرتبطة بها. لا يمكن التراجع.")) return;
          start(async () => {
            await adminDeleteQuestionSet(locale, questionSet.id);
          });
        }}
      >
        حذف المجموعة
      </button>
    </AdminPage>
  );

  function move(index: number, direction: -1 | 1) {
    setQuestions((current) => {
      const next = [...current];
      const target = index + direction;
      const item = next[index];
      const other = next[target];
      if (!item || !other) return current;
      next[index] = other;
      next[target] = item;
      return next;
    });
  }

  function replaceOption(id: string, index: number, option: QuestionOption) {
    updateQuestion(id, (question) => ({
      ...question,
      options: question.options.map((item, itemIndex) => (itemIndex === index ? option : item)),
    }));
  }
}

function defaultOptions(): QuestionOption[] {
  return [
    { value: "option_a", label: "Option A", labelAr: "خيار أ" },
    { value: "option_b", label: "Option B", labelAr: "خيار ب" },
  ];
}

function toDraft(question: Question): QuestionDraft {
  return {
    id: question.id,
    key: question.key,
    type: question.type,
    label: question.label,
    labelAr: question.labelAr ?? "",
    helpText: question.helpText ?? "",
    helpTextAr: question.helpTextAr ?? "",
    required: question.required,
    sortOrder: question.sortOrder,
    options: question.options,
    showIf: question.showIf,
  };
}

function ConditionFields({
  question,
  questions,
  onChange,
}: {
  question: QuestionDraft;
  questions: QuestionDraft[];
  onChange: (showIf: QuestionDraft["showIf"]) => void;
}) {
  const parent = questions.find((item) => item.key === question.showIf?.questionKey);
  const choices = parent && (parent.type === "single_choice" || parent.type === "multiple_choice") ? parent.options : [];
  return (
    <div className="grid gap-2 md:col-span-2 md:grid-cols-2">
      <label className="text-sm">
        يظهر فقط إذا
        <select
          value={question.showIf?.questionKey ?? ""}
          className={adminInputClass}
          onChange={(event) => {
            const questionKey = event.target.value;
            if (!questionKey) {
              onChange(null);
              return;
            }
            const nextParent = questions.find((item) => item.key === questionKey);
            const equals = nextParent?.type === "yes_no" ? "yes" : nextParent?.options[0]?.value || "yes";
            onChange({ questionKey, equals });
          }}
        >
          <option value="">يظهر دائماً</option>
          {questions
            .filter((item) => item.id !== question.id)
            .map((item) => (
              <option key={item.id} value={item.key}>
                {item.labelAr || item.label || item.key}
              </option>
            ))}
        </select>
      </label>
      {question.showIf ? (
        <label className="text-sm">
          تساوي
          {parent?.type === "yes_no" ? (
            <select value={question.showIf.equals} className={adminInputClass} onChange={(event) => onChange({ questionKey: question.showIf!.questionKey, equals: event.target.value })}>
              <option value="yes">نعم</option>
              <option value="no">لا</option>
            </select>
          ) : choices.length ? (
            <select value={question.showIf.equals} className={adminInputClass} onChange={(event) => onChange({ questionKey: question.showIf!.questionKey, equals: event.target.value })}>
              {choices.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.labelAr || option.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={question.showIf.equals}
              dir="ltr"
              className={adminInputClass}
              onChange={(event) => onChange({ questionKey: question.showIf!.questionKey, equals: event.target.value })}
            />
          )}
        </label>
      ) : null}
    </div>
  );
}

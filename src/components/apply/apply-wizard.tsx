"use client";

import { Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";
import {
  applyCouponAction,
  clearCouponAction,
  deleteDocumentAction,
  goToStepAction,
  saveAnswersAction,
  saveTravelersAction,
  startPaymentAction,
  uploadDocumentAction,
} from "@/app/actions/apply";
import {
  BackLink,
  Card,
  CopyText,
  Flag,
  Pill,
  Ring,
  SectionTitle,
  StatusPill,
  bytes,
  inputClass,
  quietButton,
  say,
  secondaryButton,
} from "@/components/account/ui";
import { Swap, surfaceClass } from "@/components/motion/frame";
import { track } from "@/lib/analytics";
import { documentGaps } from "@/lib/application-rules";
import { href } from "@/lib/href";
import { t, tf } from "@/lib/i18n";
import { docHint, docLabel, localizedVisaLabel } from "@/lib/localize";
import type { ProfileVault } from "@/lib/profile";
import type { Application, ApplicationDocument, Traveler } from "@/lib/types";
import { discountAmount, type CouponRule } from "@/lib/coupon-math";
import { answerLabel, choiceLabel, missingAnswers, questionPrompt, type AnswerQuestion } from "@/lib/visa-answers";
import { formatDate, formatMoney } from "@/lib/visa";
import { cn } from "@/lib/utils";
import {
  dobProblem,
  feePreview,
  forwardUnlocked,
  nameProblem,
  passportProblem,
  phoneOk,
  toDraft,
  travelerBlocks,
  warnsSixMonths,
  type ApplyStepId,
  type TravelerDraft,
} from "./readiness";

const stepLabel: Record<ApplyStepId, "apply.travelers" | "apply.documents" | "apply.answers" | "apply.review" | "apply.payment"> = {
  travelers: "apply.travelers",
  documents: "apply.documents",
  answers: "apply.answers",
  review: "apply.review",
  payment: "apply.payment",
};

let backupCache: { id: string; raw: string; value: TravelerDraft[] | null } = { id: "", raw: "", value: null };

function readDraftBackup(id: string): TravelerDraft[] | null {
  let raw = "";
  try {
    raw = window.localStorage.getItem(`evisa-draft:${id}`) ?? "";
  } catch {
    raw = "";
  }
  if (backupCache.id === id && backupCache.raw === raw) return backupCache.value;
  let value: TravelerDraft[] | null = null;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        const drafts = parsed.filter((item) => item && typeof item === "object").map((item) => toDraft(item as TravelerDraft));
        value = drafts.length ? drafts : null;
      }
    } catch {
      value = null;
    }
  }
  backupCache = { id, raw, value };
  return value;
}

function subscribeDraftBackup() {
  return () => {};
}

function draftFromProfile(profile: ProfileVault | null): TravelerDraft {
  if (!profile) return toDraft();
  return toDraft(profile);
}

function toInput(drafts: TravelerDraft[]) {
  return drafts.map((draft) => ({
    id: draft.id,
    firstName: draft.firstName.trim(),
    lastName: draft.lastName.trim(),
    sex: draft.sex || null,
    dateOfBirth: draft.dateOfBirth.trim() || null,
    nationality: draft.nationality.trim() || null,
    passportNumber: draft.passportNumber.trim() || null,
    passportExpiry: draft.passportExpiry.trim() || null,
  }));
}

function revealInvalid() {
  window.setTimeout(() => {
    document.querySelector<HTMLElement>("[data-apply-invalid]")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 40);
}

async function prepareUpload(file: File) {
  if (!file.type.startsWith("image/") || file.size < 1_500_000 || typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    bitmap.close();
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export function ApplyWizard({
  locale,
  application,
  travelers,
  documents,
  profile,
  countLocked = false,
  phone = "",
  today,
  nationalities,
  destinationLabel,
  questions = [],
  savedAnswers = [],
}: {
  locale: string;
  application: Application;
  travelers: Traveler[];
  documents: ApplicationDocument[];
  profile: ProfileVault | null;
  countLocked?: boolean;
  phone?: string | null;
  today: string;
  nationalities: { code: string; name: string }[];
  destinationLabel: string;
  questions?: AnswerQuestion[];
  savedAnswers?: { questionId: string | null; answer: string }[];
}) {
  const [mobile, setMobile] = useState(phone ?? "");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const router = useRouter();
  const hasQuestions = questions.length > 0;
  const stepOrder = useMemo<ApplyStepId[]>(
    () => (hasQuestions ? ["travelers", "documents", "answers", "review", "payment"] : ["travelers", "documents", "review", "payment"]),
    [hasQuestions],
  );
  const [step, setStep] = useState<ApplyStepId>(application.step === "done" || (application.step === "answers" && !hasQuestions) ? (application.step === "answers" ? "documents" : "review") : application.step);
  const editable = application.status === "draft" || application.status === "payment_pending";
  const backup = useSyncExternalStore(
    subscribeDraftBackup,
    () => (editable && travelers.length === 0 ? readDraftBackup(application.id) : null),
    () => null,
  );
  const serverDrafts = useMemo(
    () => (travelers.length ? travelers.map((person) => toDraft(person)) : backup ?? [draftFromProfile(profile)]),
    [backup, profile, travelers],
  );
  const [draftOverride, setDraftOverride] = useState<TravelerDraft[] | null>(null);
  const drafts = useMemo(() => {
    const base = draftOverride ?? serverDrafts;
    if (!base.length || base.length !== travelers.length || travelers.some((person) => !person.id) || base.every((draft) => draft.id)) return base;
    return base.map((draft, index) => ({ ...draft, id: draft.id || travelers[index].id }));
  }, [draftOverride, serverDrafts, travelers]);
  const [error, setError] = useState<string | null>(null);
  const [showIssues, setShowIssues] = useState(false);
  const [showPayIssues, setShowPayIssues] = useState(false);
  const [pending, start] = useTransition();

  const required = application.documentsRequired.length ? application.documentsRequired : ["passport"];
  const gaps = documentGaps(required, travelers, documents);
  const savedKinds = new Set(profile?.documents.map((doc) => doc.kind) ?? []);
  const profilePassport = profile?.passportNumber.trim().toLowerCase() ?? "";
  const travelersReady = drafts.length > 0 && drafts.every((draft) => !travelerBlocks(draft, application.departureDate, today));
  const samePeople = travelers.length > 0 && drafts.length === travelers.length && drafts.every((draft) => draft.id);
  const documentsReady = travelersReady && samePeople && gaps.length === 0;
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(savedAnswers.flatMap((answer) => (answer.questionId ? [[answer.questionId, answer.answer]] : []))),
  );
  const arabic = locale.toLowerCase().startsWith("ar");
  const answersReady = !hasQuestions || missingAnswers(questions, answerDrafts).length === 0;
  const ready = { travelers: travelersReady, documents: documentsReady, answers: answersReady };
  const docSlots = Math.max(travelers.length, drafts.length) * required.length;
  const readyDocs = documents.filter(
    (doc) => doc.status !== "rejected" && required.includes(doc.kind) && travelers.some((person) => person.id === doc.travelerId),
  ).length;
  const fees = feePreview(application, drafts.length || application.travelerCount, countLocked);
  const couponRule: CouponRule | null =
    application.couponKind && application.couponValue != null && application.couponAppliesTo
      ? { kind: application.couponKind, value: application.couponValue, appliesTo: application.couponAppliesTo }
      : null;
  const discount = editable && couponRule ? discountAmount({ govFee: fees.gov, serviceFee: fees.service }, couponRule) : application.discountAmount;
  const payable = editable ? fees.gov + fees.service - discount : application.totalAmount;
  const feesChanged = !countLocked && drafts.length > 0 && drafts.length !== application.travelerCount;
  const money = (amount: number) => formatMoney(amount, application.currency, locale);
  const names = drafts
    .map((draft) => `${draft.firstName} ${draft.lastName}`.trim())
    .filter(Boolean)
    .join(locale.toLowerCase().startsWith("ar") ? "، " : ", ");

  useEffect(() => {
    if (!editable || !draftOverride) return;
    window.localStorage.setItem(`evisa-draft:${application.id}`, JSON.stringify(drafts));
    if (!drafts.every((draft) => draft.id && !travelerBlocks(draft, application.departureDate, today))) return;
    const timer = window.setTimeout(() => {
      start(async () => {
        const saved = await saveTravelersAction(locale, application.id, toInput(drafts), false);
        if (!saved.ok) setError(saved.error);
        else setError(null);
      });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [application.departureDate, application.id, draftOverride, drafts, editable, locale, start, today]);

  useEffect(() => {
    if (step === "documents") track("travelers_done", { item_id: application.destinationSlug });
    if (step === "review") track("documents_done", { item_id: application.destinationSlug });
    if (step === "review" || step === "payment") track("reach_payment", { item_id: application.destinationSlug });
  }, [step, application.destinationSlug]);

  function go(next: ApplyStepId) {
    if (next === step) return;
    const back = stepOrder.indexOf(next) < stepOrder.indexOf(step);
    if (back) {
      setError(null);
      setStep(next);
      if (next !== application.step) {
        start(async () => {
          const moved = await goToStepAction(locale, application.id, next);
          if (!moved.ok) setError(moved.error);
        });
      }
      return;
    }
    if (!forwardUnlocked(next, ready)) {
      setShowIssues(true);
      revealInvalid();
      return;
    }
    if (step === "travelers") {
      start(async () => {
        setError(null);
        const saved = await saveTravelersAction(locale, application.id, toInput(drafts), next === "documents");
        if (!saved.ok) {
          setError(saved.error);
          setShowIssues(true);
          revealInvalid();
          return;
        }
        router.refresh();
        if (next === "documents" || !documentsReady) {
          if (next !== "documents") setShowIssues(true);
          setStep("documents");
          return;
        }
        const target: ApplyStepId = hasQuestions && !answersReady ? "answers" : next === "payment" ? "payment" : hasQuestions && next === "answers" ? "answers" : "review";
        const moved = await goToStepAction(locale, application.id, target === "payment" ? "review" : target);
        if (!moved.ok) {
          setError(moved.error);
          setStep("documents");
          return;
        }
        setStep(target);
      });
      return;
    }
    if (step === "documents" && next === "answers") {
      start(async () => {
        setError(null);
        const moved = await goToStepAction(locale, application.id, "answers");
        if (!moved.ok) setError(moved.error);
        else setStep("answers");
      });
      return;
    }
    if (step === "answers") {
      start(async () => {
        setError(null);
        const saved = await saveAnswersAction(locale, application.id, answerDrafts);
        if (!saved.ok) {
          setError(saved.error);
          setShowIssues(true);
          return;
        }
        const moved = await goToStepAction(locale, application.id, "review");
        if (!moved.ok) {
          setError(moved.error);
          return;
        }
        setStep(next === "payment" ? "payment" : "review");
      });
      return;
    }
    if (next === "payment") {
      setStep("payment");
      return;
    }
    start(async () => {
      setError(null);
      if (hasQuestions) {
        const saved = await saveAnswersAction(locale, application.id, answerDrafts);
        if (!saved.ok) {
          setError(saved.error);
          setShowIssues(true);
          setStep("answers");
          return;
        }
      }
      const moved = await goToStepAction(locale, application.id, "review");
      if (!moved.ok) {
        setError(moved.error);
        return;
      }
      setStep("review");
    });
  }

  function pay() {
    setShowPayIssues(true);
    if (!phoneOk(mobile) || !acceptedTerms) {
      if (!acceptedTerms) setError(t(locale, "apply.terms"));
      revealInvalid();
      return;
    }
    if (!documentsReady) {
      setError(t(locale, "err.docsBeforePay"));
      setShowIssues(true);
      setStep("documents");
      return;
    }
    if (!answersReady) {
      setError(t(locale, "err.answers"));
      setShowIssues(true);
      setStep("answers");
      return;
    }
    start(async () => {
      setError(null);
      if (hasQuestions) {
        const saved = await saveAnswersAction(locale, application.id, answerDrafts);
        if (!saved.ok) {
          setError(saved.error);
          setShowIssues(true);
          setStep("answers");
          return;
        }
      }
      track("add_payment_info", { item_id: application.destinationSlug, value: payable });
      const result = await startPaymentAction(locale, application.id, mobile, acceptedTerms);
      if (result && !result.ok) setError(result.error);
    });
  }

  function upload(travelerId: string, kind: string, file: File) {
    start(async () => {
      setError(null);
      const prepared = await prepareUpload(file);
      const fd = new FormData();
      fd.set("locale", locale);
      fd.set("applicationId", application.id);
      fd.set("travelerId", travelerId);
      fd.set("kind", kind);
      fd.set("file", prepared);
      const res = await uploadDocumentAction(fd);
      if (!res.ok) setError(res.error);
      router.refresh();
    });
  }

  const checklist = [
    { id: "travelers", step: "travelers" as const, done: travelersReady, pay: false, label: t(locale, "apply.travelers") },
    { id: "documents",
      step: "documents" as const,
      done: documentsReady,
      pay: false,
      label: docSlots ? say(locale, `Documents · ${readyDocs}/${docSlots}`, `المستندات · ${readyDocs}/${docSlots}`) : t(locale, "apply.documents"),
    },
    ...(hasQuestions
      ? [{ id: "answers", step: "answers" as const, done: answersReady, pay: false, label: t(locale, "apply.answers") }]
      : []),
    { id: "phone", step: "review" as const, done: phoneOk(mobile), pay: true, label: t(locale, "apply.phone") },
    { id: "terms", step: "review" as const, done: acceptedTerms, pay: true, label: say(locale, "Terms accepted", "الموافقة على الشروط") },
  ];
  const checklistDone = checklist.filter((item) => item.done).length;

  return (
    <div className={cn("mx-auto w-full min-w-0 max-w-6xl px-4 py-8 sm:py-10", surfaceClass(locale))}>
      <BackLink locale={locale} to={href("/account", locale)}>
        {t(locale, "account.back")}
      </BackLink>

      <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="min-w-0 space-y-5">
          <Card className="sm:p-6">
            <TitleBlock locale={locale} application={application} destinationLabel={destinationLabel} />
            {editable ? (
              <ol className={cn("mt-6 grid gap-2", stepOrder.length > 4 ? "grid-cols-5" : "grid-cols-4")} aria-label={say(locale, "Application steps", "خطوات الطلب")}>
                {stepOrder.map((id, index) => {
                  const current = stepOrder.indexOf(step);
                  const open = index <= current || forwardUnlocked(id, ready);
                  const active = id === step;
                  return (
                    <li key={id} className="min-w-0">
                      <button
                        type="button"
                        aria-current={active ? "step" : undefined}
                        aria-disabled={!open}
                        onClick={() => {
                          if (open) go(id);
                          else {
                            setShowIssues(true);
                            revealInvalid();
                          }
                        }}
                        className="w-full text-start"
                      >
                        <span className={cn("block h-1.5 rounded-full", index <= current ? "bg-brand" : "bg-[#eceef6]")} />
                        <span className={cn("mt-2 block truncate text-[11px] leading-tight", active ? "font-semibold text-[#16182b]" : index < current ? "text-body" : "text-muted-ink")}>
                          {t(locale, stepLabel[id])}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            ) : null}
            <dl className="mt-6 grid grid-cols-2 gap-2.5 xl:grid-cols-4">
              <Fact label={t(locale, "account.guaranteed")} value={application.guaranteedAt ? formatDate(application.guaranteedAt, locale) : "—"} />
              <Fact
                label={say(locale, "Departure", "موعد السفر")}
                value={application.departureDate ? formatDate(application.departureDate, locale) : "—"}
                sub={application.departureDate ? undefined : say(locale, "Not set", "غير محدد")}
              />
              <Fact label={t(locale, "account.travelers")} value={String(editable ? drafts.length : Math.max(travelers.length, application.travelerCount))} sub={names || undefined} />
              <Fact
                label={t(locale, "account.total")}
                value={money(payable)}
                sub={
                  !editable
                    ? application.paidAt
                      ? t(locale, "account.payPaid")
                      : undefined
                    : feesChanged
                      ? say(locale, "Updates when you save", "يتحدّث عند الحفظ")
                      : say(locale, "Not paid yet", "لم يُدفع بعد")
                }
                tone={editable && feesChanged ? "amber" : undefined}
              />
            </dl>
          </Card>

          {!editable ? (
            <Card>
              <SectionTitle title={t(locale, "apply.lockedTitle")} hint={t(locale, "apply.lockedBody")} />
              <Link href={href(`/account/applications/${application.id}`, locale)} className="mt-5 inline-flex h-12 items-center justify-center rounded-full bg-brand px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-600">
                {t(locale, "account.track")}
              </Link>
            </Card>
          ) : (
            <>
              {error ? (
                <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm leading-relaxed text-rose-700 ring-1 ring-rose-200 ring-inset">
                  {error}
                </p>
              ) : null}
              <Swap id={step}>
                {step === "travelers" ? (
                  <div className="space-y-4">
                    {countLocked ? (
                      <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-200 ring-inset">
                        {say(locale, "The number of travellers is locked because a payment is already open. You can still correct the details.", "عدد المسافرين مقفل لأن عملية دفع مفتوحة. يمكنك تصحيح البيانات.")}
                      </p>
                    ) : null}
                    {drafts.map((draft, index) => (
                      <TravelerCard
                        key={draft.id ?? `new-${index}`}
                        locale={locale}
                        index={index}
                        value={draft}
                        today={today}
                        departure={application.departureDate}
                        nationalities={nationalities}
                        fromProfile={index === 0 && Boolean(profilePassport) && draft.passportNumber.trim().toLowerCase() === profilePassport}
                        showIssues={showIssues}
                        onChange={(next) => setDraftOverride(drafts.map((row, rowIndex) => (rowIndex === index ? next : row)))}
                        onRemove={countLocked || drafts.length <= 1 ? undefined : () => setDraftOverride(drafts.filter((_, rowIndex) => rowIndex !== index))}
                      />
                    ))}
                    {!countLocked ? (
                      <button
                        type="button"
                        onClick={() => setDraftOverride([...drafts, toDraft()])}
                        className="flex h-14 w-full items-center justify-center gap-2 rounded-[22px] border border-dashed border-[#d8dbea] bg-white text-sm font-semibold text-brand-700 transition-colors hover:border-brand-200 hover:bg-brand-50/40"
                      >
                        {say(locale, "Add a traveller", "إضافة مسافر")}
                      </button>
                    ) : null}
                    <ActionBar
                      pending={pending}
                      pendingLabel={say(locale, "Please wait…", "لحظات…")}
                      note={showIssues && !travelersReady ? say(locale, "Fix the highlighted fields to continue.", "صحّح الحقول المظللة للمتابعة.") : null}
                      label={t(locale, "apply.continueDocuments")}
                      onClick={() => go("documents")}
                    />
                  </div>
                ) : null}

                {step === "documents" ? (
                  <div className="space-y-4">
                    <Card>
                      <SectionTitle
                        title={t(locale, "apply.documents")}
                        hint={
                          docSlots
                            ? say(locale, `${readyDocs} of ${docSlots} files ready. A clear photo or PDF is enough.`, `${readyDocs} من ${docSlots} ملفات جاهزة. تكفي صورة واضحة أو PDF.`)
                            : say(locale, "A clear photo or PDF is enough.", "تكفي صورة واضحة أو PDF.")
                        }
                      />
                      {profile && savedKinds.size > 0 ? <p className="mt-3 text-sm leading-relaxed text-muted-ink">{t(locale, "apply.profileFiles")}</p> : null}
                      <div className="mt-4 space-y-5">
                        {(travelers.length ? travelers : drafts).map((person, index) => (
                          <div key={person.id ?? index}>
                            <p className="text-sm font-semibold text-[#16182b]">
                              {person.firstName} {person.lastName}
                            </p>
                            {!person.id ? <p className="mt-1 text-xs text-muted-ink">{say(locale, "Save the traveller before attaching files.", "احفظ المسافر قبل إرفاق الملفات.")}</p> : null}
                            <ul className="mt-2 space-y-2">
                              {required.map((kind) => {
                                const doc = documents.find((item) => item.kind === kind && item.travelerId === (person.id ?? null));
                                return (
                                  <DocRow
                                    key={kind}
                                    locale={locale}
                                    kind={kind}
                                    doc={doc}
                                    fromProfile={Boolean(doc && doc.status !== "rejected" && savedKinds.has(kind))}
                                    showIssues={showIssues}
                                    pending={pending || !person.id}
                                    onUpload={(file) => person.id && upload(person.id, kind, file)}
                                    onRemove={
                                      doc && doc.status !== "rejected"
                                        ? () =>
                                            start(async () => {
                                              const removed = await deleteDocumentAction(locale, application.id, doc.id);
                                              if (!removed.ok) setError(removed.error);
                                              router.refresh();
                                            })
                                        : undefined
                                    }
                                  />
                                );
                              })}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </Card>
                    <ActionBar
                      pending={pending}
                      pendingLabel={say(locale, "Please wait…", "لحظات…")}
                      note={showIssues && !documentsReady ? t(locale, "apply.missingDocs") : null}
                      label={hasQuestions ? t(locale, "apply.continueAnswers") : t(locale, "apply.continueReview")}
                      onClick={() => go(hasQuestions ? "answers" : "review")}
                    />
                  </div>
                ) : null}

                {step === "answers" ? (
                  <div className="space-y-4">
                    <Card>
                      <SectionTitle
                        title={t(locale, "apply.answers")}
                        hint={say(locale, "A few short answers for this visa type.", "إجابات قصيرة خاصة بنوع التأشيرة.")}
                      />
                      <div className="mt-4 space-y-5">
                        {questions.map((question) => {
                          const value = answerDrafts[question.id] ?? "";
                          const problem = showIssues ? missingAnswers([question], answerDrafts).length > 0 : false;
                          return (
                            <fieldset key={question.id} data-apply-invalid={problem ? "" : undefined} className="min-w-0">
                              <legend className="text-sm font-semibold text-[#16182b]">
                                {questionPrompt(question, arabic)}
                                {question.required ? <span className="text-rose-600"> *</span> : null}
                              </legend>
                              {question.kind === "text" || question.kind === "date" ? (
                                <input
                                  type={question.kind === "date" ? "date" : "text"}
                                  dir={question.kind === "date" ? "ltr" : undefined}
                                  value={value}
                                  maxLength={question.kind === "date" ? 10 : 200}
                                  onChange={(event) => setAnswerDrafts((current) => ({ ...current, [question.id]: event.target.value }))}
                                  className={cn(inputClass, "mt-2", problem && "border-rose-300")}
                                />
                              ) : (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {(question.kind === "yes_no"
                                    ? [
                                        { value: "yes", label: arabic ? "نعم" : "Yes" },
                                        { value: "no", label: arabic ? "لا" : "No" },
                                      ]
                                    : question.choices.map((choice) => ({ value: choice.en, label: choiceLabel(choice, arabic) }))
                                  ).map((choice) => (
                                    <button
                                      key={choice.value}
                                      type="button"
                                      aria-pressed={value === choice.value}
                                      onClick={() => setAnswerDrafts((current) => ({ ...current, [question.id]: choice.value }))}
                                      className={cn(
                                        "h-10 rounded-full border px-4 text-sm font-semibold",
                                        value === choice.value ? "border-[#16182b] bg-[#16182b] text-white" : "border-[#e3e5f2] bg-white text-[#16182b]",
                                        problem && value !== choice.value && "border-rose-300",
                                      )}
                                    >
                                      {choice.label}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </fieldset>
                          );
                        })}
                      </div>
                    </Card>
                    <ActionBar
                      pending={pending}
                      pendingLabel={say(locale, "Please wait…", "لحظات…")}
                      note={showIssues && !answersReady ? t(locale, "err.answers") : null}
                      label={t(locale, "apply.continueReview")}
                      onClick={() => go("review")}
                    />
                  </div>
                ) : null}

                {step === "review" || step === "payment" ? (
                  <div className="space-y-4">
                    {step === "review" ? (
                      <Card>
                        <SectionTitle title={say(locale, "Check the application", "راجع الطلب")} hint={say(locale, "You can still go back and edit.", "يمكنك الرجوع وتعديل البيانات.")} />
                        <ul className="mt-4 divide-y divide-[#eef0f6]">
                          {travelers.map((person) => (
                            <li key={person.id} className="flex items-center justify-between gap-3 py-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[#16182b]">
                                  {person.firstName} {person.lastName}
                                </p>
                                <p className="mt-0.5 truncate text-xs text-muted-ink" dir="ltr">
                                  {person.passportNumber}
                                </p>
                              </div>
                              <button type="button" onClick={() => go("travelers")} className={quietButton}>
                                {say(locale, "Edit", "تعديل")}
                              </button>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-2 flex items-center justify-between gap-3 border-t border-[#eef0f6] pt-3">
                          <p className="text-sm text-body">
                            {documentsReady
                              ? say(locale, "Every required file is attached.", "كل الملفات المطلوبة مرفقة.")
                              : t(locale, "apply.missingDocs")}
                          </p>
                          <button type="button" onClick={() => go("documents")} className={quietButton}>
                            {say(locale, "Edit", "تعديل")}
                          </button>
                        </div>
                        {hasQuestions ? (
                          <ul className="mt-2 divide-y divide-[#eef0f6] border-t border-[#eef0f6]">
                            {questions.map((question) => (
                              <li key={question.id} className="flex items-start justify-between gap-3 py-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-[#16182b]">{questionPrompt(question, arabic)}</p>
                                  <p className="mt-0.5 text-xs text-muted-ink">{answerLabel(question.kind, answerDrafts[question.id] ?? "", question.choices, arabic) || "—"}</p>
                                </div>
                                <button type="button" onClick={() => go("answers")} className={quietButton}>
                                  {say(locale, "Edit", "تعديل")}
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </Card>
                    ) : (
                      <Card>
                        <SectionTitle
                          title={say(locale, "Pay to submit", "ادفع لإرسال الطلب")}
                          hint={say(locale, "Card details are entered on the next page. They are not stored here.", "بيانات البطاقة تُكتب في الصفحة التالية، ولا تُحفظ هنا.")}
                        />
                      </Card>
                    )}
                    <PayPanel
                      locale={locale}
                      mobile={mobile}
                      acceptedTerms={acceptedTerms}
                      showIssues={showPayIssues}
                      pending={pending}
                      total={money(payable)}
                      onPhone={setMobile}
                      onTerms={(checked) => {
                        setAcceptedTerms(checked);
                        if (checked) setError((current) => (current === t(locale, "apply.terms") ? null : current));
                      }}
                      onPay={pay}
                    />
                  </div>
                ) : null}
              </Swap>
            </>
          )}
        </div>

        <aside className="min-w-0 space-y-5 lg:sticky lg:top-24 lg:self-start">
          {editable ? (
            <Card>
              <div className="flex items-center gap-3">
                <Ring percent={Math.round((checklistDone / checklist.length) * 100)} size={52} label={say(locale, `${checklistDone} of ${checklist.length} ready to pay`, `${checklistDone} من ${checklist.length} قبل الدفع`)} />
                <SectionTitle title={say(locale, "Before you pay", "قبل الدفع")} hint={say(locale, `${checklistDone} of ${checklist.length} done`, `أنجزت ${checklistDone} من ${checklist.length}`)} />
              </div>
              <ul className="mt-4 space-y-1">
                {checklist.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!item.done) {
                          if (item.pay) setShowPayIssues(true);
                          else setShowIssues(true);
                        }
                        go(item.step);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-start text-sm transition-colors hover:bg-surface"
                    >
                      <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold", item.done ? "bg-emerald-500 text-white" : "border-2 border-dashed border-amber-400 text-transparent")}>
                        {item.done ? "✓" : ""}
                      </span>
                      <span className={cn("min-w-0 flex-1 truncate", item.done ? "text-muted-ink" : "font-medium text-[#16182b]")}>{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
          <Card>
            <SectionTitle title={say(locale, "Amount", "المبلغ")} hint={editable && feesChanged ? say(locale, "The saved total changes with the traveller count.", "الإجمالي المحفوظ يتغير مع عدد المسافرين.") : undefined} />
            <dl className="mt-4 space-y-2 text-sm">
              <PriceRow label={t(locale, "apply.govFee")} value={money(editable ? fees.gov : application.govFee)} />
              <PriceRow label={t(locale, "apply.serviceFee")} value={money(editable ? fees.service : application.serviceFee)} />
              {discount > 0 ? <PriceRow label={application.couponCode ? `${t(locale, "apply.discount")} · ${application.couponCode}` : t(locale, "apply.discount")} value={`− ${money(discount)}`} /> : null}
              <PriceRow label={t(locale, "apply.total")} value={money(payable)} strong />
            </dl>
            {editable ? (
              <form
                className="mt-4 flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  start(async () => {
                    setError(null);
                    const result = await applyCouponAction(locale, application.id, couponCode);
                    if (!result.ok) setError(result.error);
                    else {
                      setCouponCode("");
                      router.refresh();
                    }
                  });
                }}
              >
                <input
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value)}
                  placeholder={say(locale, "Discount code", "رمز الخصم")}
                  dir="ltr"
                  className={inputClass}
                  aria-label={say(locale, "Discount code", "رمز الخصم")}
                />
                <button type="submit" disabled={pending || !couponCode.trim()} className="h-12 shrink-0 rounded-full border border-[#e3e5f2] px-4 text-sm font-semibold text-[#16182b] disabled:opacity-50">
                  {say(locale, "Apply", "تطبيق")}
                </button>
              </form>
            ) : null}
            {editable && application.couponCode ? (
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const result = await clearCouponAction(locale, application.id);
                    if (!result.ok) setError(result.error);
                    else router.refresh();
                  })
                }
                className="mt-2 text-xs font-semibold text-brand-700"
              >
                {say(locale, `Remove ${application.couponCode}`, `إزالة ${application.couponCode}`)}
              </button>
            ) : null}
            <p className="mt-4 text-xs leading-relaxed text-muted-ink">{say(locale, "Passport copies stay on this website.", "صور الجواز تبقى محفوظة على هذا الموقع.")}</p>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function TitleBlock({ locale, application, destinationLabel }: { locale: string; application: Application; destinationLabel: string }) {
  const visa = localizedVisaLabel(application, locale);
  return (
    <div className="flex min-w-0 items-start gap-4">
      <Flag src={application.destinationFlag} className="size-12 sm:size-14" />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="min-w-0 text-2xl font-semibold tracking-tight text-[#16182b] sm:text-[28px]">{destinationLabel}</h1>
          <StatusPill status={application.status} locale={locale} />
        </div>
        <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-body">
          <span>{t(locale, "apply.title")}</span>
          {visa ? <span className="text-muted-ink">· {visa}</span> : null}
          {application.express ? <Pill tone="amber">{say(locale, "Express", "سريع")}</Pill> : null}
        </p>
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-ink">
          {say(locale, "Reference", "رقم الطلب")}
          <CopyText value={application.reference} locale={locale} />
        </p>
      </div>
    </div>
  );
}

function Fact({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "amber" }) {
  return (
    <div className={cn("min-w-0 rounded-2xl px-3.5 py-3", tone === "amber" ? "bg-amber-50 ring-1 ring-amber-200 ring-inset" : "bg-surface")}>
      <dt className="truncate text-xs text-muted-ink">{label}</dt>
      <dd className="mt-1 truncate text-sm font-semibold tabular-nums text-[#16182b]">{value}</dd>
      {sub ? <dd className={cn("mt-0.5 truncate text-xs", tone === "amber" ? "font-medium text-amber-800" : "text-muted-ink")}>{sub}</dd> : null}
    </div>
  );
}

function PriceRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-3", strong && "border-t border-[#eef0f6] pt-2 font-semibold text-[#16182b]")}>
      <dt className={strong ? "" : "text-muted-ink"}>{label}</dt>
      <dd className="tabular-nums" dir="ltr">
        {value}
      </dd>
    </div>
  );
}

function ActionBar({ pending, pendingLabel, note, label, onClick }: { pending: boolean; pendingLabel: string; note: string | null; label: string; onClick: () => void }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="min-h-5 text-sm text-muted-ink">{note}</p>
      <button
        type="button"
        disabled={pending}
        onClick={onClick}
        className="inline-flex h-12 w-full items-center justify-center rounded-full bg-brand px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-56"
      >
        {pending ? pendingLabel : label}
      </button>
    </div>
  );
}

function shownSex(value: string) {
  const sex = value.trim().toLowerCase();
  if (sex === "m" || sex === "male") return "male";
  if (sex === "f" || sex === "female") return "female";
  return sex === "other" ? "other" : "";
}

function Field({
  label,
  optional,
  error,
  warn,
  children,
}: {
  label: string;
  optional?: string;
  error?: string | null;
  warn?: string | null;
  children: ReactNode;
}) {
  return (
    <label className="block min-w-0 text-sm" data-apply-invalid={error ? "" : undefined}>
      <span className="flex items-baseline justify-between gap-2">
        <span className="font-medium text-[#16182b]">{label}</span>
        {optional ? <span className="text-xs text-muted-ink">{optional}</span> : null}
      </span>
      <div className="mt-1.5">{children}</div>
      {error ? <span className="mt-1 block text-xs leading-relaxed text-rose-600">{error}</span> : warn ? <span className="mt-1 block text-xs leading-relaxed text-amber-800">{warn}</span> : null}
    </label>
  );
}

function TravelerCard({
  locale,
  index,
  value,
  today,
  departure,
  nationalities,
  fromProfile,
  showIssues,
  onChange,
  onRemove,
}: {
  locale: string;
  index: number;
  value: TravelerDraft;
  today: string;
  departure: string | null;
  nationalities: { code: string; name: string }[];
  fromProfile: boolean;
  showIssues: boolean;
  onChange: (next: TravelerDraft) => void;
  onRemove?: () => void;
}) {
  const optional = say(locale, "Optional", "اختياري");
  const set = (key: keyof TravelerDraft, next: string) => onChange({ ...value, [key]: key === "passportNumber" ? next.toUpperCase() : next });
  const first = nameProblem(value.firstName);
  const last = nameProblem(value.lastName);
  const birth = dobProblem(value.dateOfBirth, today);
  const expiry = passportProblem(value.passportExpiry, departure, today);
  const passportEmpty = !value.passportNumber.trim();
  const shown = (problem: string | null) => (problem && problem !== "empty" ? problem : showIssues ? problem : null);
  const text = (problem: string | null, empty: [string, string]) => {
    if (problem === "letters") return say(locale, "Use English letters as printed in the passport", "اكتبه بالحروف الإنجليزية كما في الجواز");
    if (problem === "long") return say(locale, "Keep it under 50 characters", "الحد الأقصى 50 حرفاً");
    if (problem === "future") return say(locale, "Must be a date in the past", "يجب أن يكون تاريخاً سابقاً");
    if (problem === "year") return say(locale, "Check the year", "راجع السنة");
    if (problem === "expired") return say(locale, "This passport has expired. Enter the current one", "هذا الجواز منتهٍ. أدخل الجواز الحالي");
    if (problem === "short") return t(locale, "err.passportShort");
    if (problem === "empty") return say(locale, empty[0], empty[1]);
    return null;
  };
  const nationality = value.nationality.toUpperCase();
  const known = nationalities.some((country) => country.code === nationality);
  const ready = !travelerBlocks(value, departure, today);
  const sex = shownSex(value.sex);
  const sexes = [
    ["female", "apply.female"],
    ["male", "apply.male"],
    ["other", "apply.other"],
  ] as const;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-[#16182b]">{tf(locale, "apply.travellerN", { n: index + 1 })}</h2>
          <p className="mt-0.5 text-sm text-muted-ink">{say(locale, "Exactly as printed in the passport.", "كما هو مطبوع في الجواز.")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {fromProfile ? <Pill tone="brand">{t(locale, "apply.fromProfile")}</Pill> : null}
          <Pill tone={ready ? "green" : "amber"}>{ready ? say(locale, "Ready", "جاهز") : say(locale, "Needs details", "ناقص")}</Pill>
          {onRemove ? (
            <button type="button" onClick={onRemove} className="text-xs font-medium text-rose-600">
              {t(locale, "common.remove")}
            </button>
          ) : null}
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label={t(locale, "apply.firstName")} error={text(shown(first), ["Enter the first name", "اكتب الاسم الأول"])}>
          <input aria-invalid={Boolean(shown(first))} autoComplete="given-name" value={value.firstName} onChange={(event) => set("firstName", event.target.value)} className={inputClass} />
        </Field>
        <Field label={t(locale, "apply.lastName")} error={text(shown(last), ["Enter the last name", "اكتب اسم العائلة"])}>
          <input aria-invalid={Boolean(shown(last))} autoComplete="family-name" value={value.lastName} onChange={(event) => set("lastName", event.target.value)} className={inputClass} />
        </Field>
        <Field label={t(locale, "apply.dob")} error={text(shown(birth), ["Enter the date of birth", "اكتب تاريخ الميلاد"])}>
          <input aria-invalid={Boolean(shown(birth))} type="date" dir="ltr" value={value.dateOfBirth} onChange={(event) => set("dateOfBirth", event.target.value)} className={inputClass} />
        </Field>
        <div className="block min-w-0 text-sm">
          <span className="flex items-baseline justify-between gap-2">
            <span className="font-medium text-[#16182b]">{t(locale, "apply.sex")}</span>
            <span className="text-xs text-muted-ink">{optional}</span>
          </span>
          <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-xl bg-surface p-1">
            {sexes.map(([id, key]) => (
              <button
                key={id}
                type="button"
                aria-pressed={sex === id}
                onClick={() => set("sex", sex === id ? "" : id)}
                className={cn("h-9 rounded-lg px-2 text-xs font-medium", sex === id ? "bg-white text-[#16182b] shadow-sm" : "text-muted-ink")}
              >
                {t(locale, key)}
              </button>
            ))}
          </div>
        </div>
        <Field label={t(locale, "apply.nationality")} optional={optional}>
          <select value={known ? nationality : ""} onChange={(event) => set("nationality", event.target.value)} className={inputClass}>
            <option value="">{t(locale, "common.select")}</option>
            {nationalities.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t(locale, "apply.passportNo")} error={text(showIssues && passportEmpty ? "empty" : null, ["Enter the passport number", "اكتب رقم الجواز"])}>
          <input
            aria-invalid={showIssues && passportEmpty}
            dir="ltr"
            autoCapitalize="characters"
            spellCheck={false}
            value={value.passportNumber}
            onChange={(event) => set("passportNumber", event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field
          label={t(locale, "apply.passportExp")}
          error={text(shown(expiry), ["Enter the expiry date", "اكتب تاريخ الانتهاء"])}
          warn={!shown(expiry) && warnsSixMonths(value.passportExpiry, departure, today) ? say(locale, "Most destinations ask for 6 months of validity after travel.", "أغلب الوجهات تطلب صلاحية 6 أشهر بعد السفر.") : null}
        >
          <input aria-invalid={Boolean(shown(expiry))} type="date" dir="ltr" value={value.passportExpiry} onChange={(event) => set("passportExpiry", event.target.value)} className={inputClass} />
        </Field>
      </div>
    </Card>
  );
}

function DocRow({
  locale,
  kind,
  doc,
  fromProfile,
  showIssues,
  pending,
  onUpload,
  onRemove,
}: {
  locale: string;
  kind: string;
  doc?: ApplicationDocument;
  fromProfile: boolean;
  showIssues: boolean;
  pending: boolean;
  onUpload: (file: File) => void;
  onRemove?: () => void;
}) {
  const [over, setOver] = useState(false);
  const rejected = doc?.status === "rejected";
  const ready = Boolean(doc) && !rejected;
  const take = (file: File | undefined) => {
    if (file) onUpload(file);
  };
  return (
    <li
      data-apply-invalid={!ready && showIssues ? "" : undefined}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        take(event.dataTransfer.files?.[0]);
      }}
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-2xl border p-3",
        rejected && "border-rose-200 bg-rose-50",
        ready && "border-emerald-200 bg-emerald-50/60",
        !ready && !rejected && (showIssues ? "border-rose-300 bg-rose-50" : "border-dashed border-[#d8dbea] bg-surface/70"),
        over && "border-brand bg-brand-50",
      )}
    >
      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold", ready ? "bg-emerald-500 text-white" : rejected ? "bg-rose-500 text-white" : "bg-white text-muted-ink ring-1 ring-[#e3e5f2]")}>
        {ready ? "✓" : rejected ? "!" : <Upload className="size-3.5" aria-hidden />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-[#16182b]">{docLabel(kind, locale)}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-ink">
          {ready ? (
            <>
              <span dir="ltr">{doc?.fileName}</span>
              {doc?.sizeBytes ? <span> · {bytes(doc.sizeBytes)}</span> : null}
              {fromProfile ? ` · ${t(locale, "apply.savedProfile")}` : ""}
            </>
          ) : (
            docHint(kind, locale) || t(locale, "apply.uploadFile")
          )}
        </span>
        {rejected ? (
          <span className="mt-1 block text-xs leading-relaxed text-rose-700">
            {t(locale, "apply.rejected")}
            {doc?.rejectReason ? `: ${doc.rejectReason}` : ""}. {t(locale, "apply.rejectedNew")}
          </span>
        ) : null}
      </span>
      {ready && onRemove ? (
        <button type="button" onClick={onRemove} className="shrink-0 text-xs font-medium text-rose-600">
          {t(locale, "common.remove")}
        </button>
      ) : (
        <label className={cn(secondaryButton, "shrink-0 cursor-pointer", pending && "pointer-events-none opacity-50")}>
          {t(locale, "common.upload")}
          <input
            type="file"
            className="sr-only"
            accept="image/*,application/pdf"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              take(file);
            }}
          />
        </label>
      )}
    </li>
  );
}

function PayPanel({
  locale,
  mobile,
  acceptedTerms,
  showIssues,
  pending,
  total,
  onPhone,
  onTerms,
  onPay,
}: {
  locale: string;
  mobile: string;
  acceptedTerms: boolean;
  showIssues: boolean;
  pending: boolean;
  total: string;
  onPhone: (value: string) => void;
  onTerms: (checked: boolean) => void;
  onPay: () => void;
}) {
  const phoneError = !showIssues || phoneOk(mobile) ? null : mobile.trim() ? say(locale, "Use 8 to 15 digits. A leading + is fine.", "من 8 إلى 15 رقماً، ويمكن البدء بـ +.") : say(locale, "Add a mobile number.", "أضف رقم الموبايل.");
  const termsError = showIssues && !acceptedTerms;
  return (
    <Card>
      <SectionTitle title={t(locale, "apply.payment")} hint={say(locale, "We use the number if a document is still missing.", "نستخدم الرقم إذا بقي مستند ناقصاً.")} />
      <div className="mt-4" id="apply-phone" data-apply-invalid={phoneError ? "" : undefined}>
        <Field label={t(locale, "apply.phone")} error={phoneError}>
          <input aria-invalid={Boolean(phoneError)} inputMode="tel" autoComplete="tel" dir="ltr" value={mobile} onChange={(event) => onPhone(event.target.value)} className={inputClass} />
        </Field>
      </div>
      <div id="apply-terms" data-apply-invalid={termsError ? "" : undefined} className={cn("mt-4 rounded-2xl border p-4", termsError ? "border-rose-300 bg-rose-50" : "border-[#e3e5f2] bg-surface/60")}>
        <div className="flex items-start gap-3 text-sm leading-relaxed text-[#16182b]">
          <input id="apply-terms-input" type="checkbox" checked={acceptedTerms} onChange={(event) => onTerms(event.target.checked)} className="mt-1 size-4 shrink-0 accent-[#5057ea]" />
          <p>
            <label htmlFor="apply-terms-input">{say(locale, "I agree to the", "أوافق على")}</label>{" "}
            <Link href={href("/terms", locale)} target="_blank" rel="noreferrer" className="font-semibold text-brand-700 underline-offset-2 hover:underline">
              {say(locale, "terms", "الشروط")}
            </Link>{" "}
            {say(locale, "and the", "وعلى")}{" "}
            <Link href={href("/transparency/refunds-policy", locale)} target="_blank" rel="noreferrer" className="font-semibold text-brand-700 underline-offset-2 hover:underline">
              {say(locale, "refunds policy", "سياسة الاسترداد")}
            </Link>
            .
          </p>
        </div>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={onPay}
        className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-full bg-[#ffd873] px-6 text-sm font-semibold text-[#16182b] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
      >
        {t(locale, "apply.pay")} {total}
      </button>
    </Card>
  );
}

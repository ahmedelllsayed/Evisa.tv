"use client";

import { useState, useTransition } from "react";
import { continueQuestionsAction, deleteQuestionFileAction, saveAnswersAction, uploadQuestionFileAction } from "@/app/actions/questions";
import { isArabicLocale, t } from "@/lib/i18n";
import {
  formatAnswer,
  helpText,
  missingRequired,
  optionText,
  parseAnswerInput,
  questionText,
  storedFileHref,
  visibleQuestions,
  type AnswerValue,
  type Question,
} from "@/lib/questions";
import { cn } from "@/lib/utils";

type Entry = { text: string; values: string[] };
type FileState = { path: string | null; name: string | null };

export function QuestionnaireForm({
  locale,
  applicationId,
  questions,
  answers,
  mode,
  locked = false,
  onContinue,
}: {
  locale: string;
  applicationId: string;
  questions: Question[];
  answers: AnswerValue[];
  mode: "wizard" | "account";
  locked?: boolean;
  onContinue?: () => void;
}) {
  const arabic = isArabicLocale(locale);
  const [entries, setEntries] = useState<Record<string, Entry>>(() => initialEntries(questions, answers));
  const [files, setFiles] = useState<Record<string, FileState>>(() => initialFiles(answers));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showMissing, setShowMissing] = useState(false);
  const [pending, start] = useTransition();
  const current = toAnswers(questions, entries, files);
  const visible = visibleQuestions(questions, current);

  function setEntry(id: string, entry: Entry) {
    setSaved(false);
    setEntries((currentEntries) => ({ ...currentEntries, [id]: entry }));
  }
  const missing = new Set(missingRequired(questions, current).map((question) => question.id));

  if (!questions.length) return null;

  function payload() {
    return questions
      .filter((question) => question.type !== "file")
      .filter((question) => parseAnswerInput(question, entries[question.id] ?? { text: "", values: [] }).ok)
      .map((question) => ({
        questionId: question.id,
        text: entries[question.id]?.text ?? "",
        values: entries[question.id]?.values ?? [],
      }));
  }

  function invalidVisible() {
    return visible.some((question) => question.type !== "file" && !parseAnswerInput(question, entries[question.id] ?? { text: "", values: [] }).ok);
  }

  const readOnly = (
    <div dir={arabic ? "rtl" : "ltr"} className="space-y-3 text-start">
      {visible.map((question) => {
        const answer = current.find((item) => item.questionId === question.id);
        const value = formatAnswer(question, answer, locale);
        return (
          <div key={question.id} className="rounded-2xl border border-line px-4 py-3">
            <p className="text-sm font-medium">{questionText(question, locale)}</p>
            {question.type === "file" && answer?.filePath ? (
              <a href={storedFileHref(answer.filePath)} className="mt-1 block text-sm text-brand" target="_blank" rel="noreferrer">
                {answer.fileName}
              </a>
            ) : (
              <p className="mt-1 text-sm text-body">{value || "—"}</p>
            )}
          </div>
        );
      })}
    </div>
  );

  if (locked) {
    return (
      <section id="questions" className="mt-8">
        <h2 className="font-medium">{t(locale, mode === "wizard" ? "apply.questions" : "account.questions")}</h2>
        <p className="mt-1 text-sm text-muted-ink">{t(locale, "account.questionsLocked")}</p>
        <div className="mt-4">{readOnly}</div>
      </section>
    );
  }

  return (
    <section id="questions" dir={arabic ? "rtl" : "ltr"} className="mt-8 space-y-4 text-start">
      <div>
        <h2 className="font-medium">{t(locale, mode === "wizard" ? "apply.questions" : "account.questions")}</h2>
        <p className="mt-1 text-sm text-muted-ink">{t(locale, mode === "wizard" ? "apply.questionsHint" : "account.questionsHint")}</p>
      </div>
      {visible.map((question) => {
        const entry = entries[question.id] ?? { text: "", values: [] };
        const file = files[question.id];
        const showError = showMissing && missing.has(question.id);
        const fieldDir = question.type === "number" || question.type === "date" ? "ltr" : arabic ? "rtl" : "ltr";
        return (
          <div key={question.id} className={cn("rounded-2xl border p-4", showError ? "border-red-400" : "border-line")}>
            <p className="text-sm font-medium" id={`${question.id}-label`}>
              {questionText(question, locale)}
              {question.required ? <span className="text-red-600"> *</span> : null}
            </p>
            {helpText(question, locale) ? <p className="mt-1 text-xs text-muted-ink">{helpText(question, locale)}</p> : null}
            <div className="mt-3">
              {question.type === "long_text" ? (
                <textarea
                  id={question.id}
                  dir={fieldDir}
                  value={entry.text}
                  rows={4}
                  onChange={(event) => setEntry(question.id, { text: event.target.value, values: [] })}
                  className="w-full rounded-xl border border-line px-3 py-2 outline-none focus:border-brand-300"
                />
              ) : null}
              {question.type === "short_text" || question.type === "number" || question.type === "date" ? (
                <input
                  id={question.id}
                  dir={fieldDir}
                  type={question.type === "short_text" ? "text" : question.type}
                  inputMode={question.type === "number" ? "decimal" : undefined}
                  value={entry.text}
                  onChange={(event) => setEntry(question.id, { text: event.target.value, values: [] })}
                  className="h-11 w-full rounded-xl border border-line px-3 outline-none focus:border-brand-300"
                />
              ) : null}
              {question.type === "yes_no" ? (
                <div className="flex flex-wrap gap-2">
                  {(["yes", "no"] as const).map((value) => (
                    <label key={value} className={cn("inline-flex min-h-11 items-center gap-2 rounded-full border px-4", entry.text === value ? "border-brand bg-brand-50" : "border-line")}>
                      <input
                        type="radio"
                        name={question.id}
                        checked={entry.text === value}
                        onChange={() => setEntry(question.id, { text: value, values: [] })}
                      />
                      {t(locale, value === "yes" ? "apply.yes" : "apply.no")}
                    </label>
                  ))}
                </div>
              ) : null}
              {question.type === "single_choice" ? (
                <select
                  id={question.id}
                  dir={arabic ? "rtl" : "ltr"}
                  value={entry.text}
                  onChange={(event) => setEntry(question.id, { text: event.target.value, values: [] })}
                  className="h-11 w-full rounded-xl border border-line px-3 outline-none focus:border-brand-300"
                >
                  <option value="">{t(locale, "common.select")}</option>
                  {question.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {optionText(option, locale)}
                    </option>
                  ))}
                </select>
              ) : null}
              {question.type === "multiple_choice" ? (
                <ul className="space-y-2">
                  {question.options.map((option) => {
                    const checked = entry.values.includes(option.value);
                    return (
                      <li key={option.value}>
                        <label className="flex min-h-11 items-start gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={checked}
                            onChange={() => {
                              const values = checked ? entry.values.filter((value) => value !== option.value) : [...entry.values, option.value];
                              setEntry(question.id, { text: "", values });
                            }}
                          />
                          <span>{optionText(option, locale)}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              {question.type === "file" ? (
                <div className="flex flex-wrap items-center gap-3">
                  {file?.path ? (
                    <a href={storedFileHref(file.path)} className="text-sm text-brand" target="_blank" rel="noreferrer">
                      {file.name}
                    </a>
                  ) : (
                    <span className="text-sm text-muted-ink">{t(locale, "apply.uploadFile")}</span>
                  )}
                  <label className="cursor-pointer rounded-full bg-[#f1f2f7] px-3 py-2 text-xs font-medium">
                    {t(locale, file?.path ? "common.replace" : "common.upload")}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,application/pdf"
                      onChange={(event) => {
                        const selected = event.target.files?.[0];
                        event.target.value = "";
                        if (!selected) return;
                        const body = new FormData();
                        body.set("locale", locale);
                        body.set("applicationId", applicationId);
                        body.set("questionId", question.id);
                        body.set("file", selected);
                        start(async () => {
                          setError(null);
                          const result = await uploadQuestionFileAction(body);
                          if (!result.ok) setError(result.error);
                          else setFiles((currentFiles) => ({ ...currentFiles, [question.id]: { path: result.storagePath, name: result.fileName } }));
                        });
                      }}
                    />
                  </label>
                  {file?.path ? (
                    <button
                      type="button"
                      className="text-xs text-red-600"
                      onClick={() =>
                        start(async () => {
                          const result = await deleteQuestionFileAction(locale, applicationId, question.id);
                          if (!result.ok) setError(result.error);
                          else setFiles((currentFiles) => ({ ...currentFiles, [question.id]: { path: null, name: null } }));
                        })
                      }
                    >
                      {t(locale, "common.remove")}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
      {missing.size > 0 && showMissing ? <p className="text-sm text-red-600">{t(locale, "account.questionsMissing")}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {saved ? <p className="text-sm text-muted-ink">{t(locale, "apply.saved")}</p> : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={pending}
          className="h-12 w-full rounded-full border border-line px-4 font-medium disabled:opacity-60 sm:w-auto"
          onClick={() =>
            start(async () => {
              setSaved(false);
              setError(null);
              if (invalidVisible()) {
                setError(t(locale, "err.questionInvalid"));
                return;
              }
              const result = await saveAnswersAction(locale, applicationId, payload());
              if (!result.ok) setError(result.error);
              else setSaved(true);
            })
          }
        >
          {t(locale, "apply.saveProgress")}
        </button>
        {mode === "wizard" ? (
          <button
            type="button"
            disabled={pending}
            className="h-12 w-full rounded-full bg-brand font-medium text-white disabled:opacity-60"
            onClick={() =>
              start(async () => {
                setSaved(false);
                setError(null);
                setShowMissing(true);
                if (missing.size || invalidVisible()) {
                  setError(t(locale, missing.size ? "err.questions" : "err.questionInvalid"));
                  return;
                }
                const result = await continueQuestionsAction(locale, applicationId, payload());
                if (!result.ok) setError(result.error);
                else onContinue?.();
              })
            }
          >
            {t(locale, "apply.continueReview")}
          </button>
        ) : null}
      </div>
    </section>
  );
}

function initialEntries(questions: Question[], answers: AnswerValue[]) {
  const byId = new Map(answers.map((answer) => [answer.questionId, answer]));
  return Object.fromEntries(
    questions.map((question) => {
      const answer = byId.get(question.id);
      return [question.id, { text: answer?.text ?? "", values: answer?.values ?? [] }];
    }),
  );
}

function initialFiles(answers: AnswerValue[]) {
  return Object.fromEntries(answers.map((answer) => [answer.questionId, { path: answer.filePath, name: answer.fileName }]));
}

function toAnswers(questions: Question[], entries: Record<string, Entry>, files: Record<string, FileState>): AnswerValue[] {
  return questions.map((question) => ({
    questionId: question.id,
    text: entries[question.id]?.text ?? null,
    values: entries[question.id]?.values ?? null,
    filePath: files[question.id]?.path ?? null,
    fileName: files[question.id]?.name ?? null,
    fileMime: null,
    fileSize: null,
  }));
}

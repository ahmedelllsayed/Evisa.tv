import { isArabicLocale } from "@/lib/i18n";

export const QUESTION_TYPES = [
  "short_text",
  "long_text",
  "yes_no",
  "single_choice",
  "multiple_choice",
  "date",
  "number",
  "file",
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

export type QuestionOption = {
  value: string;
  label: string;
  labelAr: string;
};

export type ShowIf = {
  questionKey: string;
  equals: string;
};

export type Question = {
  id: string;
  questionSetId: string | null;
  applicationId: string | null;
  key: string;
  type: QuestionType;
  label: string;
  labelAr: string | null;
  helpText: string | null;
  helpTextAr: string | null;
  required: boolean;
  sortOrder: number;
  options: QuestionOption[];
  showIf: ShowIf | null;
  isActive: boolean;
};

export type AnswerValue = {
  questionId: string;
  text: string | null;
  values: string[] | null;
  filePath: string | null;
  fileName: string | null;
  fileMime: string | null;
  fileSize: number | null;
};

export type AssignmentScope = {
  questionSetId: string;
  destinationId: string;
  visaOptionId: string | null;
  visaType: string | null;
};

export type ResolveContext = {
  destinationId: string;
  visaOptionId: string | null;
  visaType: string | null;
};

/** Schengen members. Keep this list in sync with supabase/migrations/0029_questionnaires.sql. */
export const SCHENGEN_COUNTRY_CODES = [
  "AT", "BE", "BG", "CH", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GR", "HR", "HU",
  "IS", "IT", "LI", "LT", "LU", "LV", "MT", "NL", "NO", "PL", "PT", "RO", "SE", "SI", "SK",
] as const;

const SCHENGEN = new Set<string>(SCHENGEN_COUNTRY_CODES);

export function isSchengenCountry(code: string) {
  return SCHENGEN.has(code.trim().toUpperCase());
}

export function questionText(question: { label: string; labelAr?: string | null }, locale: string) {
  const arabic = question.labelAr?.trim();
  return isArabicLocale(locale) && arabic ? arabic : question.label;
}

export function helpText(question: { helpText?: string | null; helpTextAr?: string | null }, locale: string) {
  const arabic = question.helpTextAr?.trim();
  if (isArabicLocale(locale) && arabic) return arabic;
  return question.helpText?.trim() || "";
}

export function optionText(option: QuestionOption, locale: string) {
  const arabic = option.labelAr?.trim();
  return isArabicLocale(locale) && arabic ? arabic : option.label;
}

const EMPTY_OPTION = "00000000-0000-0000-0000-000000000000";

/** Higher rank wins: visa option, then destination + visa type, then destination. */
export function assignmentRank(assignment: AssignmentScope, ctx: ResolveContext): number | null {
  if (assignment.destinationId !== ctx.destinationId) return null;
  if (assignment.visaOptionId) {
    return assignment.visaOptionId === ctx.visaOptionId ? 3 : null;
  }
  if (assignment.visaType) return assignment.visaType === ctx.visaType ? 2 : null;
  return 1;
}

export function pickQuestionSetId(assignments: AssignmentScope[], ctx: ResolveContext): string | null {
  let best: { rank: number; id: string } | null = null;
  for (const assignment of assignments) {
    const rank = assignmentRank(assignment, ctx);
    if (rank == null) continue;
    if (!best || rank > best.rank) best = { rank, id: assignment.questionSetId };
  }
  return best?.id ?? null;
}

export function assignmentScopeKey(assignment: Pick<AssignmentScope, "destinationId" | "visaOptionId" | "visaType">) {
  return `${assignment.destinationId}:${assignment.visaOptionId ?? EMPTY_OPTION}:${assignment.visaType ?? ""}`;
}

function answerMap(answers: AnswerValue[]) {
  return new Map(answers.map((answer) => [answer.questionId, answer]));
}

export function isQuestionVisible(question: Question, questions: Question[], answers: AnswerValue[], seen = new Set<string>()): boolean {
  if (!question.showIf?.questionKey) return true;
  if (seen.has(question.key)) return false;
  const parent = questions.find((item) => item.key === question.showIf?.questionKey);
  if (!parent) return false;
  const next = new Set(seen);
  next.add(question.key);
  if (!isQuestionVisible(parent, questions, answers, next)) return false;
  const answer = answerMap(answers).get(parent.id);
  return answerMatches(parent, answer, question.showIf.equals);
}

export function visibleQuestions(questions: Question[], answers: AnswerValue[]) {
  return questions.filter((question) => question.isActive && isQuestionVisible(question, questions, answers));
}

function answerMatches(question: Question, answer: AnswerValue | undefined, expected: string) {
  if (!answer) return false;
  if (question.type === "multiple_choice") return (answer.values ?? []).includes(expected);
  return (answer.text ?? "").trim() === expected;
}

export function isAnswerFilled(question: Question, answer: AnswerValue | undefined) {
  if (!answer) return false;
  if (question.type === "file") return Boolean(answer.filePath);
  if (question.type === "multiple_choice") return (answer.values ?? []).length > 0;
  return Boolean(answer.text?.trim());
}

export function missingRequired(questions: Question[], answers: AnswerValue[]) {
  const byId = answerMap(answers);
  return visibleQuestions(questions, answers).filter((question) => question.required && !isAnswerFilled(question, byId.get(question.id)));
}

export type ParsedAnswer =
  | { ok: true; empty: boolean; text: string | null; values: string[] | null }
  | { ok: false };

const SHORT_MAX = 500;
const LONG_MAX = 4000;

export function parseAnswerInput(question: Question, input: { text?: string | null; values?: string[] | null }): ParsedAnswer {
  if (question.type === "file") return { ok: true, empty: true, text: null, values: null };
  if (question.type === "multiple_choice") {
    const values = [...new Set((input.values ?? []).map((value) => value.trim()).filter(Boolean))];
    if (!values.length) return { ok: true, empty: true, text: null, values: null };
    const allowed = new Set(question.options.map((option) => option.value));
    if (values.some((value) => !allowed.has(value))) return { ok: false };
    return { ok: true, empty: false, text: null, values };
  }
  const text = (input.text ?? "").trim();
  if (!text) return { ok: true, empty: true, text: null, values: null };
  if (question.type === "yes_no") {
    return text === "yes" || text === "no" ? { ok: true, empty: false, text, values: null } : { ok: false };
  }
  if (question.type === "single_choice") {
    return question.options.some((option) => option.value === text)
      ? { ok: true, empty: false, text, values: null }
      : { ok: false };
  }
  if (question.type === "number") {
    if (!/^-?\d+(\.\d+)?$/.test(text) || text.length > 16 || !Number.isFinite(Number(text))) return { ok: false };
    return { ok: true, empty: false, text, values: null };
  }
  if (question.type === "date") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return { ok: false };
    const [year, month, day] = text.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    const real = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
    return real ? { ok: true, empty: false, text, values: null } : { ok: false };
  }
  const limit = question.type === "long_text" ? LONG_MAX : SHORT_MAX;
  if (text.length > limit) return { ok: false };
  return { ok: true, empty: false, text, values: null };
}

export function invalidAnswers(questions: Question[], answers: AnswerValue[]) {
  const byId = answerMap(answers);
  return visibleQuestions(questions, answers).filter((question) => {
    const answer = byId.get(question.id);
    if (!answer || question.type === "file") return false;
    return !parseAnswerInput(question, answer).ok;
  });
}

export function isQuestionnaireComplete(questions: Question[], answers: AnswerValue[]) {
  return missingRequired(questions, answers).length === 0 && invalidAnswers(questions, answers).length === 0;
}

export function formatAnswer(question: Question, answer: AnswerValue | undefined, locale: string) {
  if (!answer) return "";
  if (question.type === "file") return answer.fileName || "";
  if (question.type === "yes_no") {
    if (answer.text === "yes") return isArabicLocale(locale) ? "نعم" : "Yes";
    if (answer.text === "no") return isArabicLocale(locale) ? "لا" : "No";
    return answer.text ?? "";
  }
  if (question.type === "single_choice") {
    const option = question.options.find((item) => item.value === answer.text);
    return option ? optionText(option, locale) : (answer.text ?? "");
  }
  if (question.type === "multiple_choice") {
    return (answer.values ?? [])
      .map((value) => {
        const option = question.options.find((item) => item.value === value);
        return option ? optionText(option, locale) : value;
      })
      .join(", ");
  }
  return answer.text ?? "";
}

export function hasConditionCycle(questions: { key: string; showIf: ShowIf | null }[]) {
  const byKey = new Map(questions.map((question) => [question.key, question]));
  const state = new Map<string, "visiting" | "done">();
  const walk = (key: string): boolean => {
    const mark = state.get(key);
    if (mark === "visiting") return true;
    if (mark === "done") return false;
    state.set(key, "visiting");
    const parent = byKey.get(key)?.showIf?.questionKey;
    if (parent && byKey.has(parent) && walk(parent)) return true;
    state.set(key, "done");
    return false;
  };
  return questions.some((question) => walk(question.key));
}

export function slugKey(label: string, taken: Set<string>) {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32) || "question";
  const stem = /^[a-z]/.test(base) ? base : `q_${base}`.slice(0, 40);
  let key = stem;
  let n = 2;
  while (taken.has(key)) {
    const suffix = `_${n}`;
    key = `${stem.slice(0, 40 - suffix.length)}${suffix}`;
    n += 1;
  }
  return key;
}

export function answersToCsv(reference: string, questions: Question[], answers: AnswerValue[]) {
  const byId = answerMap(answers);
  const lines = [["reference", "question_key", "label_en", "label_ar", "type", "answer_en", "answer_ar", "file_name"].join(",")];
  for (const question of questions) {
    const answer = byId.get(question.id);
    lines.push(
      [
        reference,
        question.key,
        question.label,
        question.labelAr ?? "",
        question.type,
        formatAnswer(question, answer, "en-EG"),
        formatAnswer(question, answer, "ar-EG"),
        answer?.fileName ?? "",
      ].map(csvCell).join(","),
    );
  }
  return `\uFEFF${lines.join("\n")}`;
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export const VISA_TYPE_FILTERS = ["e-visa", "sticker", "eta", "visa-free"] as const;

export type QuestionDraft = {
  id: string;
  key: string;
  type: QuestionType;
  label: string;
  labelAr: string;
  helpText: string;
  helpTextAr: string;
  required: boolean;
  sortOrder: number;
  options: QuestionOption[];
  showIf: ShowIf | null;
};

export type AssignmentDraft = {
  destinationId: string;
  visaOptionId: string | null;
  visaType: string | null;
};

export function storedFileHref(storagePath: string) {
  return `/api/files/${storagePath.split("/").map((part) => encodeURIComponent(part)).join("/")}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEY_RE = /^[a-z][a-z0-9_]{0,39}$/;
const OPTION_RE = /^[a-z0-9_]{1,40}$/;

export function isUuid(value: string) {
  return UUID_RE.test(value);
}

/** Returns an English error code, or null when the draft can be stored. */
export function questionDraftError(questions: QuestionDraft[]): string | null {
  if (questions.length > 80) return "too_many";
  const keys = new Set<string>();
  for (const question of questions) {
    if (!isUuid(question.id)) return "id";
    if (!KEY_RE.test(question.key)) return "key";
    if (keys.has(question.key)) return "duplicate_key";
    keys.add(question.key);
    if (!QUESTION_TYPES.includes(question.type)) return "type";
    if (!question.label.trim() || question.label.trim().length > 300) return "label";
    if (!question.labelAr.trim() || question.labelAr.trim().length > 300) return "label";
    if (question.helpText.trim().length > 500 || question.helpTextAr.trim().length > 500) return "help";
    const choice = question.type === "single_choice" || question.type === "multiple_choice";
    if (choice && question.options.length < 2) return "options";
    if (!choice && question.options.length > 0) return "options";
    if (question.options.length > 20) return "options";
    const optionValues = new Set<string>();
    for (const option of question.options) {
      if (!OPTION_RE.test(option.value) || optionValues.has(option.value)) return "options";
      optionValues.add(option.value);
      if (!option.label.trim() || option.label.trim().length > 160) return "options";
      if (!option.labelAr.trim() || option.labelAr.trim().length > 160) return "options";
    }
    if (question.showIf) {
      if (!KEY_RE.test(question.showIf.questionKey) || question.showIf.questionKey === question.key) return "condition";
      if (!keys.has(question.showIf.questionKey) && !questions.some((item) => item.key === question.showIf?.questionKey)) return "condition";
      if (!question.showIf.equals.trim() || question.showIf.equals.trim().length > 80) return "condition";
    }
  }
  if (hasConditionCycle(questions)) return "cycle";
  return null;
}

export function assignmentDraftError(assignments: AssignmentDraft[]): string | null {
  const seen = new Set<string>();
  for (const assignment of assignments) {
    if (!isUuid(assignment.destinationId)) return "destination";
    if (assignment.visaOptionId && !isUuid(assignment.visaOptionId)) return "option";
    if (assignment.visaOptionId && assignment.visaType) return "scope";
    if (assignment.visaType && !(VISA_TYPE_FILTERS as readonly string[]).includes(assignment.visaType)) return "type";
    const key = assignmentScopeKey({
      destinationId: assignment.destinationId,
      visaOptionId: assignment.visaOptionId,
      visaType: assignment.visaType,
    });
    if (seen.has(key)) return "duplicate_scope";
    seen.add(key);
  }
  return null;
}

export const ANSWER_EDIT_STATUSES = ["draft", "payment_pending", "submitted", "in_review", "filed"] as const;

export function canEditAnswers(status: string) {
  return (ANSWER_EDIT_STATUSES as readonly string[]).includes(status);
}

export type QuestionKind = "yes_no" | "single" | "text" | "date";

export type QuestionChoice = { en: string; ar: string };

export type QuestionInput = {
  id?: string | null;
  prompt: string;
  promptAr: string;
  kind: QuestionKind;
  choices: QuestionChoice[];
  required: boolean;
  active: boolean;
};

export type AnswerQuestion = {
  id: string;
  prompt: string;
  promptAr: string | null;
  kind: QuestionKind;
  choices: QuestionChoice[];
  required: boolean;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const textLimit = 200;

export function questionPrompt(question: { prompt: string; promptAr?: string | null }, arabic: boolean) {
  return arabic ? question.promptAr?.trim() || question.prompt : question.prompt;
}

export function choiceLabel(choice: QuestionChoice, arabic: boolean) {
  return arabic ? choice.ar.trim() || choice.en : choice.en;
}

export function answerLabel(kind: QuestionKind, answer: string, choices: QuestionChoice[], arabic: boolean) {
  if (kind === "yes_no") return answer === "yes" ? (arabic ? "نعم" : "Yes") : answer === "no" ? (arabic ? "لا" : "No") : answer;
  const match = choices.find((choice) => choice.en === answer);
  return match ? choiceLabel(match, arabic) : answer;
}

export function parseQuestionList(raw: string): { ok: true; questions: QuestionInput[] } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = raw.trim() ? JSON.parse(raw) : [];
  } catch {
    return { ok: false, error: "تعذر قراءة أسئلة نوع التأشيرة." };
  }
  if (!Array.isArray(parsed)) return { ok: false, error: "تعذر قراءة أسئلة نوع التأشيرة." };
  if (parsed.length > 20) return { ok: false, error: "الحد الأقصى 20 سؤالاً لكل نوع تأشيرة." };
  const questions: QuestionInput[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") return { ok: false, error: "سؤال غير صالح." };
    const row = item as Record<string, unknown>;
    const kind = row.kind === "yes_no" || row.kind === "single" || row.kind === "text" || row.kind === "date" ? row.kind : null;
    if (!kind) return { ok: false, error: "اختر نوع إجابة لكل سؤال." };
    const prompt = String(row.prompt ?? "").trim().slice(0, 180);
    const promptAr = String(row.promptAr ?? "").trim().slice(0, 180);
    if (!prompt && !promptAr) return { ok: false, error: "اكتب نص السؤال بالعربية أو الإنجليزية." };
    const choices: QuestionChoice[] = [];
    if (kind === "single") {
      const source = Array.isArray(row.choices) ? row.choices : [];
      for (const choice of source) {
        if (!choice || typeof choice !== "object") continue;
        const record = choice as Record<string, unknown>;
        const en = String(record.en ?? "").trim().slice(0, 80);
        const ar = String(record.ar ?? "").trim().slice(0, 80);
        if (!en && !ar) continue;
        choices.push({ en: en || ar, ar });
      }
      if (choices.length < 2) return { ok: false, error: `أضف اختيارين على الأقل لسؤال «${promptAr || prompt}».` };
      if (choices.length > 8) return { ok: false, error: `الاختيارات أكثر من 8 في سؤال «${promptAr || prompt}».` };
    }
    const id = typeof row.id === "string" && uuidPattern.test(row.id) ? row.id : null;
    questions.push({
      id,
      prompt: prompt || promptAr,
      promptAr,
      kind,
      choices,
      required: row.required !== false,
      active: row.active !== false,
    });
  }
  return { ok: true, questions };
}

export function answerProblem(question: AnswerQuestion, value: string | null | undefined): "required" | "choice" | "long" | null {
  const answer = (value ?? "").trim();
  if (!answer) return question.required ? "required" : null;
  if (question.kind === "yes_no") return answer === "yes" || answer === "no" ? null : "choice";
  if (question.kind === "date") return /^\d{4}-\d{2}-\d{2}$/.test(answer) ? null : "choice";
  if (question.kind === "single") return question.choices.some((choice) => choice.en === answer) ? null : "choice";
  if (answer.length > textLimit) return "long";
  return null;
}

export function missingAnswers(questions: AnswerQuestion[], answers: Record<string, string>) {
  return questions.filter((question) => answerProblem(question, answers[question.id]) !== null);
}

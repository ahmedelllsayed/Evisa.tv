import "server-only";
import type { Db } from "@/lib/db/core";
import { answerProblem, type AnswerQuestion, type QuestionChoice, type QuestionInput, type QuestionKind } from "@/lib/visa-answers";
import { json, num, sql, getDb } from "./db";

type Row = Record<string, unknown>;
type Queryable = Pick<Db, "query">;

export type StoredQuestion = {
  id: string;
  visaOptionId: string;
  prompt: string;
  promptAr: string | null;
  kind: QuestionKind;
  choices: QuestionChoice[];
  required: boolean;
  active: boolean;
  sortOrder: number;
};

export type StoredAnswer = {
  id: string;
  questionId: string | null;
  prompt: string;
  promptAr: string | null;
  kind: QuestionKind;
  answer: string;
  sortOrder: number;
};

function choicesOf(value: unknown): QuestionChoice[] {
  const rows = json<{ en?: string; ar?: string }[]>(value, []);
  return rows
    .map((row) => ({ en: String(row.en ?? "").trim(), ar: String(row.ar ?? "").trim() }))
    .filter((row) => row.en);
}

function toQuestion(row: Row): StoredQuestion {
  return {
    id: String(row.id),
    visaOptionId: String(row.visa_option_id),
    prompt: String(row.prompt),
    promptAr: (row.prompt_ar as string) ?? null,
    kind: row.kind as QuestionKind,
    choices: choicesOf(row.choices),
    required: Boolean(row.required),
    active: Boolean(row.is_active),
    sortOrder: num(row.sort_order),
  };
}

function toAnswer(row: Row): StoredAnswer {
  return {
    id: String(row.id),
    questionId: (row.question_id as string) ?? null,
    prompt: String(row.prompt),
    promptAr: (row.prompt_ar as string) ?? null,
    kind: row.kind as QuestionKind,
    answer: String(row.answer),
    sortOrder: num(row.sort_order),
  };
}

export async function listAllVisaQuestions() {
  const rows = await sql("select * from visa_questions order by sort_order, created_at");
  return rows.map(toQuestion);
}

export async function listActiveQuestions(optionId: string | null) {
  if (!optionId) return [];
  const rows = await sql(
    "select * from visa_questions where visa_option_id = $1 and is_active order by sort_order, created_at",
    [optionId],
  );
  return rows.map(toQuestion);
}

export async function listAnswers(applicationId: string) {
  const rows = await sql("select * from application_answers where application_id = $1 order by sort_order, created_at", [applicationId]);
  return rows.map(toAnswer);
}

export async function saveApplicationAnswers(applicationId: string, questions: AnswerQuestion[], answers: Record<string, string>) {
  const problems = questions.filter((question) => answerProblem(question, answers[question.id]));
  if (problems.length) return { ok: false as const, missing: problems.length };
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.query("delete from application_answers where application_id = $1", [applicationId]);
    for (const [index, question] of questions.entries()) {
      const answer = (answers[question.id] ?? "").trim();
      if (!answer) continue;
      await tx.query(
        `insert into application_answers (application_id, question_id, prompt, prompt_ar, kind, answer, sort_order)
         values ($1,$2,$3,$4,$5,$6,$7)`,
        [applicationId, question.id, question.prompt, question.promptAr, question.kind, answer, index],
      );
    }
  });
  return { ok: true as const };
}

export async function replaceOptionQuestions(tx: Queryable, optionId: string, questions: QuestionInput[]) {
  const kept: string[] = [];
  for (const [index, question] of questions.entries()) {
    const params = [
      question.prompt,
      question.promptAr || null,
      question.kind,
      JSON.stringify(question.kind === "single" ? question.choices : []),
      question.required,
      question.active,
      index,
    ];
    if (question.id) {
      const updated = await tx.query<{ id: string }>(
        `update visa_questions set prompt=$2, prompt_ar=$3, kind=$4, choices=$5::jsonb, required=$6, is_active=$7, sort_order=$8, updated_at=now()
         where id=$1 and visa_option_id=$9 returning id`,
        [question.id, ...params, optionId],
      );
      if (updated.length) {
        kept.push(String(updated[0].id));
        continue;
      }
    }
    const inserted = await tx.query<{ id: string }>(
      `insert into visa_questions (visa_option_id, prompt, prompt_ar, kind, choices, required, is_active, sort_order)
       values ($1,$2,$3,$4,$5::jsonb,$6,$7,$8) returning id`,
      [optionId, ...params],
    );
    kept.push(String(inserted[0].id));
  }
  await tx.query(
    `delete from visa_questions where visa_option_id = $1 ${kept.length ? "and not (id = any($2::uuid[]))" : ""}`,
    kept.length ? [optionId, `{${kept.join(",")}}`] : [optionId],
  );
}

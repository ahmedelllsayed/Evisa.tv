import assert from "node:assert/strict";
import test from "node:test";
import { answerProblem, missingAnswers, parseQuestionList, type AnswerQuestion } from "./visa-answers.ts";

const yesNo: AnswerQuestion = {
  id: "q1",
  prompt: "Have you visited before?",
  promptAr: "هل زرت من قبل؟",
  kind: "yes_no",
  choices: [],
  required: true,
};

test("a required yes or no answer blocks payment until it is yes or no", () => {
  assert.equal(answerProblem(yesNo, ""), "required");
  assert.equal(answerProblem(yesNo, "maybe"), "choice");
  assert.equal(answerProblem(yesNo, "yes"), null);
  assert.equal(missingAnswers([yesNo], {}).length, 1);
  assert.equal(missingAnswers([yesNo], { q1: "no" }).length, 0);
});

test("an optional short answer can be left empty, and a long one is refused", () => {
  const text: AnswerQuestion = { ...yesNo, id: "q2", kind: "text", required: false };
  assert.equal(answerProblem(text, "  "), null);
  assert.equal(answerProblem({ ...text, required: true }, ""), "required");
  assert.equal(answerProblem(text, "a".repeat(201)), "long");
  assert.equal(answerProblem(text, "Cairo"), null);
});

test("a date answer must be a real calendar day", () => {
  const date: AnswerQuestion = { ...yesNo, id: "q4", kind: "date", required: true };
  assert.equal(answerProblem(date, ""), "required");
  assert.equal(answerProblem(date, "12/11/2026"), "choice");
  assert.equal(answerProblem(date, "2026-12-01"), null);
  const parsed = parseQuestionList(JSON.stringify([{ prompt: "Arrival", promptAr: "الوصول", kind: "date", required: true }]));
  assert.equal(parsed.ok, true);
});

test("a single choice must be one of the saved options", () => {
  const choice: AnswerQuestion = {
    ...yesNo,
    id: "q3",
    kind: "single",
    choices: [
      { en: "Tourism", ar: "سياحة" },
      { en: "Business", ar: "عمل" },
    ],
  };
  assert.equal(answerProblem(choice, "Tourism"), null);
  assert.equal(answerProblem(choice, "سياحة"), "choice");
  const parsed = parseQuestionList(JSON.stringify([{ prompt: "Purpose", promptAr: "الغرض", kind: "single", choices: [{ en: "Tourism", ar: "سياحة" }], required: true }]));
  assert.equal(parsed.ok, false);
});

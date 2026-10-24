import assert from "node:assert/strict";
import test from "node:test";
import {
  assignmentRank,
  hasConditionCycle,
  isQuestionnaireComplete,
  isSchengenCountry,
  missingRequired,
  parseAnswerInput,
  pickQuestionSetId,
  visibleQuestions,
  type AnswerValue,
  type AssignmentScope,
  type Question,
} from "./questions.ts";

function question(partial: Partial<Question> & Pick<Question, "id" | "key" | "type">): Question {
  return {
    questionSetId: "set",
    applicationId: null,
    label: partial.key,
    labelAr: null,
    helpText: null,
    helpTextAr: null,
    required: false,
    sortOrder: 0,
    options: [],
    showIf: null,
    isActive: true,
    ...partial,
  };
}

function answer(questionId: string, text: string | null, values: string[] | null = null): AnswerValue {
  return { questionId, text, values, filePath: null, fileName: null, fileMime: null, fileSize: null };
}

test("visa option beats visa type, which beats the country set", () => {
  const country: AssignmentScope = { questionSetId: "country", destinationId: "es", visaOptionId: null, visaType: null };
  const sticker: AssignmentScope = { questionSetId: "sticker", destinationId: "es", visaOptionId: null, visaType: "sticker" };
  const option: AssignmentScope = { questionSetId: "option", destinationId: "es", visaOptionId: "opt", visaType: null };
  const ctx = { destinationId: "es", visaOptionId: "opt", visaType: "sticker" };
  assert.equal(pickQuestionSetId([country, sticker, option], ctx), "option");
  assert.equal(pickQuestionSetId([country, sticker], ctx), "sticker");
  assert.equal(pickQuestionSetId([country], { ...ctx, visaType: "e-visa", visaOptionId: null }), "country");
  assert.equal(pickQuestionSetId([sticker], { ...ctx, visaType: "e-visa", visaOptionId: null }), null);
  assert.equal(assignmentRank(option, { ...ctx, visaOptionId: "other" }), null);
});

test("a question stays hidden until the parent answer matches, including nested questions", () => {
  const previous = question({ id: "a", key: "previous_schengen", type: "yes_no", required: true });
  const copy = question({
    id: "b",
    key: "previous_copy",
    type: "file",
    required: true,
    showIf: { questionKey: "previous_schengen", equals: "yes" },
  });
  const dates = question({
    id: "c",
    key: "previous_dates",
    type: "short_text",
    required: true,
    showIf: { questionKey: "previous_copy", equals: "yes" },
  });
  const questions = [previous, copy, dates];
  assert.deepEqual(visibleQuestions(questions, []).map((item) => item.key), ["previous_schengen"]);
  assert.deepEqual(visibleQuestions(questions, [answer("a", "no")]).map((item) => item.key), ["previous_schengen"]);
  const shown = visibleQuestions(questions, [answer("a", "yes")]).map((item) => item.key);
  assert.deepEqual(shown, ["previous_schengen", "previous_copy"]);
  assert.equal(missingRequired(questions, [answer("a", "no")]).length, 0);
  assert.equal(missingRequired(questions, [answer("a", "yes")]).map((item) => item.key).join(), "previous_copy");
});

test("multiple choice reveals a follow-up when the expected option is included", () => {
  const purpose = question({
    id: "p",
    key: "purpose",
    type: "multiple_choice",
    options: [
      { value: "tourism", label: "Tourism", labelAr: "سياحة" },
      { value: "business", label: "Business", labelAr: "عمل" },
    ],
  });
  const detail = question({ id: "d", key: "detail", type: "long_text", showIf: { questionKey: "purpose", equals: "business" } });
  assert.equal(visibleQuestions([purpose, detail], [answer("p", null, ["tourism"])]).some((item) => item.key === "detail"), false);
  assert.equal(visibleQuestions([purpose, detail], [answer("p", null, ["tourism", "business"])]).some((item) => item.key === "detail"), true);
});

test("empty questionnaires are complete and invalid dates are rejected", () => {
  assert.equal(isQuestionnaireComplete([], []), true);
  const date = question({ id: "d", key: "arrival", type: "date", required: true });
  assert.equal(parseAnswerInput(date, { text: "" }).ok, true);
  assert.equal(parseAnswerInput(date, { text: "2026-02-31" }).ok, false);
  assert.equal(parseAnswerInput(date, { text: "2026-05-01" }).ok, true);
  const income = question({ id: "n", key: "income", type: "number" });
  assert.equal(parseAnswerInput(income, { text: "12000.50" }).ok, true);
  assert.equal(parseAnswerInput(income, { text: "12e3" }).ok, false);
  const choice = question({
    id: "c",
    key: "status",
    type: "single_choice",
    options: [{ value: "single", label: "Single", labelAr: "" }],
  });
  assert.equal(parseAnswerInput(choice, { text: "married" }).ok, false);
});

test("condition cycles are detected and Schengen includes Spain, the Netherlands, and Greece", () => {
  assert.equal(
    hasConditionCycle([
      { key: "a", showIf: { questionKey: "b", equals: "yes" } },
      { key: "b", showIf: { questionKey: "a", equals: "yes" } },
    ]),
    true,
  );
  assert.equal(hasConditionCycle([{ key: "a", showIf: { questionKey: "missing", equals: "yes" } }]), false);
  assert.equal(isSchengenCountry("es"), true);
  assert.equal(isSchengenCountry("NL"), true);
  assert.equal(isSchengenCountry("gr"), true);
  assert.equal(isSchengenCountry("IE"), false);
});

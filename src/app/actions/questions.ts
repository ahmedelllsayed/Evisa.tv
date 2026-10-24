"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { getCurrentUser, requireAdmin, requireUser } from "@/lib/auth";
import { getApplication, setStep } from "@/lib/data/applications";
import { sql } from "@/lib/data/db";
import {
  addApplicationQuestion,
  applicationQuestionsComplete,
  clearAnswerFile,
  createQuestionSet,
  deleteQuestionSet,
  questionsForApplication,
  removeApplicationQuestion,
  saveAnswerFile,
  saveAnswerText,
  saveQuestionSet,
} from "@/lib/data/questions";
import { t } from "@/lib/i18n";
import { canEditAnswers, isUuid, parseAnswerInput, slugKey, type AssignmentDraft, type QuestionDraft } from "@/lib/questions";
import { ALLOWED_TYPES, MAX_UPLOAD_BYTES, removeFile, storeFile } from "@/lib/storage";

async function owned(locale: string, applicationId: string) {
  const user = await requireUser(locale, `/${locale}/apply/${applicationId}`);
  const app = await getApplication(applicationId);
  if (!app || (app.userId !== user.id && user.role !== "admin")) redirect(`/${locale}/account`);
  return { user, app };
}

function refreshApplication(locale: string, applicationId: string) {
  revalidatePath(`/${locale}/apply/${applicationId}`);
  revalidatePath(`/${locale}/account/applications/${applicationId}`);
  revalidatePath(`/${locale}/admin/applications/${applicationId}`);
}

async function audit(action: string, target?: string, detail?: string) {
  const user = await getCurrentUser();
  await sql("insert into admin_audit (actor_email, action, target, detail) values ($1,$2,$3,$4)", [
    user?.email ?? null,
    action,
    target ?? null,
    detail ?? null,
  ]);
}

export async function saveAnswersAction(
  locale: string,
  applicationId: string,
  entries: { questionId: string; text: string; values: string[] }[],
) {
  const { app } = await owned(locale, applicationId);
  if (!canEditAnswers(app.status)) return { ok: false as const, error: t(locale, "err.locked") };
  const questions = await questionsForApplication(app.id);
  const byId = new Map(questions.map((question) => [question.id, question]));
  const parsed = [];
  for (const entry of entries) {
    const question = byId.get(entry.questionId);
    if (!question || question.type === "file") continue;
    const result = parseAnswerInput(question, entry);
    if (!result.ok) return { ok: false as const, error: t(locale, "err.questionInvalid") };
    parsed.push({ question, result });
  }
  for (const item of parsed) {
    await saveAnswerText(app.id, item.question, item.result.text, item.result.values);
  }
  refreshApplication(locale, app.id);
  return { ok: true as const };
}

export async function continueQuestionsAction(
  locale: string,
  applicationId: string,
  entries: { questionId: string; text: string; values: string[] }[],
) {
  const saved = await saveAnswersAction(locale, applicationId, entries);
  if (!saved.ok) return saved;
  if (!(await applicationQuestionsComplete(applicationId))) {
    return { ok: false as const, error: t(locale, "err.questions") };
  }
  const { app } = await owned(locale, applicationId);
  if (app.status === "draft" || app.status === "payment_pending") {
    const moved = await setStep(app.id, "review");
    if (!moved) return { ok: false as const, error: t(locale, "err.locked") };
  }
  refreshApplication(locale, applicationId);
  return { ok: true as const };
}

export async function uploadQuestionFileAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "");
  const applicationId = String(formData.get("applicationId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");
  const file = formData.get("file");
  const { user, app } = await owned(locale, applicationId);
  if (!canEditAnswers(app.status)) return { ok: false as const, error: t(locale, "err.locked") };
  const question = (await questionsForApplication(app.id)).find((item) => item.id === questionId && item.type === "file");
  if (!question) return { ok: false as const, error: t(locale, "err.questionInvalid") };
  if (!(file instanceof File) || !file.size) return { ok: false as const, error: t(locale, "err.chooseFile") };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false as const, error: t(locale, "err.fileSize") };
  if (!ALLOWED_TYPES.includes(file.type)) return { ok: false as const, error: t(locale, "err.fileType") };
  const storagePath = await storeFile(user.id, app.id, file);
  try {
    const previous = await saveAnswerFile(app.id, question.id, {
      path: storagePath,
      name: file.name,
      mime: file.type,
      size: file.size,
    });
    if (previous) await removeStored(previous);
  } catch (error) {
    await removeFile(storagePath).catch(() => undefined);
    return { ok: false as const, error: error instanceof Error ? error.message : t(locale, "err.saveDoc") };
  }
  refreshApplication(locale, app.id);
  return { ok: true as const, fileName: file.name, storagePath };
}

export async function deleteQuestionFileAction(locale: string, applicationId: string, questionId: string) {
  const { app } = await owned(locale, applicationId);
  if (!canEditAnswers(app.status)) return { ok: false as const, error: t(locale, "err.locked") };
  const question = (await questionsForApplication(app.id)).find((item) => item.id === questionId && item.type === "file");
  if (!question) return { ok: false as const, error: t(locale, "err.questionInvalid") };
  const previous = await clearAnswerFile(app.id, question.id);
  if (previous) await removeStored(previous);
  refreshApplication(locale, app.id);
  return { ok: true as const };
}

async function removeStored(storagePath: string) {
  const shared = await sql(
    `select 1 from documents where storage_path = $1
     union all
     select 1 from application_answers where file_path = $1
     limit 1`,
    [storagePath],
  );
  if (!shared.length) await removeFile(storagePath);
}

export async function adminCreateQuestionSet(locale: string) {
  await requireAdmin(locale);
  const id = await createQuestionSet();
  await audit("question_set.create", id);
  revalidatePath(`/${locale}/admin/questions`);
  redirect(`/${locale}/admin/questions/${id}`);
}

export async function adminSaveQuestionSet(
  locale: string,
  id: string,
  input: {
    name: string;
    nameAr: string;
    description: string;
    descriptionAr: string;
    isActive: boolean;
    questions: QuestionDraft[];
    assignments: AssignmentDraft[];
  },
) {
  await requireAdmin(locale);
  if (!isUuid(id)) return { ok: false as const, error: "المجموعة غير موجودة." };
  try {
    const result = await saveQuestionSet(id, input);
    if (!result.ok) return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "missing set") return { ok: false as const, error: "المجموعة غير موجودة." };
    if (message === "question id taken") return { ok: false as const, error: "معرّف سؤال مستخدم من قبل." };
    return { ok: false as const, error: "تعذر حفظ المجموعة. تحقق من الربط المكرر." };
  }
  await audit("question_set.save", id, input.name);
  revalidatePath(`/${locale}/admin/questions`);
  revalidatePath(`/${locale}/admin/questions/${id}`);
  return { ok: true as const };
}

export async function adminDeleteQuestionSet(locale: string, id: string) {
  await requireAdmin(locale);
  if (!isUuid(id)) return { ok: false as const, error: "المجموعة غير موجودة." };
  await deleteQuestionSet(id);
  await audit("question_set.delete", id);
  revalidatePath(`/${locale}/admin/questions`);
  redirect(`/${locale}/admin/questions`);
}

export async function adminAddApplicationQuestion(locale: string, applicationId: string, draft: QuestionDraft) {
  await requireAdmin(locale);
  const app = await getApplication(applicationId);
  if (!app) return { ok: false as const, error: "الطلب غير موجود." };
  const existing = await questionsForApplication(app.id);
  if (existing.some((question) => question.key === draft.key)) {
    draft = { ...draft, key: slugKey(draft.key, new Set(existing.map((question) => question.key))) };
  }
  if (!isUuid(draft.id)) draft = { ...draft, id: randomUUID() };
  const result = await addApplicationQuestion(app.id, draft, existing);
  if (!result.ok) return result;
  await audit("question.add", applicationId, draft.key);
  refreshApplication(locale, app.id);
  return { ok: true as const };
}

export async function adminRemoveApplicationQuestion(locale: string, applicationId: string, questionId: string) {
  await requireAdmin(locale);
  await removeApplicationQuestion(applicationId, questionId);
  await audit("question.remove", applicationId, questionId);
  refreshApplication(locale, applicationId);
  return { ok: true as const };
}

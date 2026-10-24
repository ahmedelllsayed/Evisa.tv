import "server-only";
import { getDb, json, num, one, sql } from "@/lib/data/db";
import {
  assignmentDraftError,
  isQuestionnaireComplete,
  isUuid,
  missingRequired,
  parseAnswerInput,
  pickQuestionSetId,
  questionDraftError,
  type AnswerValue,
  type AssignmentDraft,
  type AssignmentScope,
  type Question,
  type QuestionDraft,
  type QuestionOption,
  type QuestionType,
  type ShowIf,
} from "@/lib/questions";

type Row = Record<string, unknown>;

export type QuestionSetSummary = {
  id: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  isActive: boolean;
  questionCount: number;
  assignmentCount: number;
  updatedAt: string;
};

export type QuestionAssignment = AssignmentDraft & {
  id: string;
  destinationName: string;
  destinationCode: string;
  optionLabel: string | null;
};

export type QuestionSetDetail = {
  id: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  isActive: boolean;
  questions: Question[];
  assignments: QuestionAssignment[];
};

function toQuestion(row: Row): Question {
  const showIf = json<ShowIf | null>(row.show_if, null);
  return {
    id: String(row.id),
    questionSetId: row.question_set_id ? String(row.question_set_id) : null,
    applicationId: row.application_id ? String(row.application_id) : null,
    key: String(row.key),
    type: String(row.type) as QuestionType,
    label: String(row.label),
    labelAr: (row.label_ar as string) ?? null,
    helpText: (row.help_text as string) ?? null,
    helpTextAr: (row.help_text_ar as string) ?? null,
    required: Boolean(row.required),
    sortOrder: num(row.sort_order),
    options: json<QuestionOption[]>(row.options, []),
    showIf: showIf?.questionKey ? { questionKey: showIf.questionKey, equals: String(showIf.equals ?? "") } : null,
    isActive: Boolean(row.is_active),
  };
}

function toAnswer(row: Row): AnswerValue {
  const values = json<string[] | null>(row.value_json, null);
  return {
    questionId: String(row.question_id),
    text: (row.value_text as string) ?? null,
    values: Array.isArray(values) ? values.map(String) : null,
    filePath: (row.file_path as string) ?? null,
    fileName: (row.file_name as string) ?? null,
    fileMime: (row.file_mime as string) ?? null,
    fileSize: row.file_size == null ? null : num(row.file_size),
  };
}

export async function listQuestionSets() {
  const rows = await sql(
    `select s.*,
        (select count(*)::int from questions q where q.question_set_id = s.id and q.is_active) as question_count,
        (select count(*)::int from question_set_assignments a where a.question_set_id = s.id) as assignment_count
     from question_sets s
     order by s.name`,
  );
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    nameAr: (row.name_ar as string) ?? null,
    description: (row.description as string) ?? null,
    descriptionAr: (row.description_ar as string) ?? null,
    isActive: Boolean(row.is_active),
    questionCount: num(row.question_count),
    assignmentCount: num(row.assignment_count),
    updatedAt: String(row.updated_at),
  })) satisfies QuestionSetSummary[];
}

export async function getQuestionSet(id: string): Promise<QuestionSetDetail | null> {
  const row = await one("select * from question_sets where id = $1", [id]);
  if (!row) return null;
  const [questions, assignments] = await Promise.all([
    sql("select * from questions where question_set_id = $1 order by sort_order, key", [id]),
    sql(
      `select a.*, d.name as destination_name, d.code as destination_code, o.label as option_label
       from question_set_assignments a
       join destinations d on d.id = a.destination_id
       left join visa_options o on o.id = a.visa_option_id
       where a.question_set_id = $1
       order by d.name, a.visa_type nulls first`,
      [id],
    ),
  ]);
  return {
    id: String(row.id),
    name: String(row.name),
    nameAr: (row.name_ar as string) ?? null,
    description: (row.description as string) ?? null,
    descriptionAr: (row.description_ar as string) ?? null,
    isActive: Boolean(row.is_active),
    questions: questions.map(toQuestion),
    assignments: assignments.map((item) => ({
      id: String(item.id),
      destinationId: String(item.destination_id),
      destinationName: String(item.destination_name),
      destinationCode: String(item.destination_code).trim(),
      visaOptionId: item.visa_option_id ? String(item.visa_option_id) : null,
      visaType: (item.visa_type as string) ?? null,
      optionLabel: (item.option_label as string) ?? null,
    })),
  };
}

export async function createQuestionSet() {
  const row = await one<{ id: string }>(
    "insert into question_sets (name, name_ar) values ('New question set', 'مجموعة جديدة') returning id",
  );
  return String(row?.id);
}

export async function deleteQuestionSet(id: string) {
  await sql("delete from question_sets where id = $1", [id]);
}

async function applicationContext(applicationId: string) {
  const row = await one(
    `select a.destination_id, a.visa_option_id, a.visa_details, a.status, d.visa_type
     from applications a
     join destinations d on d.id = a.destination_id
     where a.id = $1`,
    [applicationId],
  );
  if (!row) return null;
  const details = json<{ visaType?: string } | null>(row.visa_details, null);
  return {
    destinationId: String(row.destination_id),
    visaOptionId: row.visa_option_id ? String(row.visa_option_id) : null,
    visaType: details?.visaType || String(row.visa_type),
    status: String(row.status),
  };
}

async function activeAssignments(): Promise<AssignmentScope[]> {
  const rows = await sql(
    `select a.question_set_id, a.destination_id, a.visa_option_id, a.visa_type
     from question_set_assignments a
     join question_sets s on s.id = a.question_set_id
     where s.is_active`,
  );
  return rows.map((row) => ({
    questionSetId: String(row.question_set_id),
    destinationId: String(row.destination_id),
    visaOptionId: row.visa_option_id ? String(row.visa_option_id) : null,
    visaType: (row.visa_type as string) ?? null,
  }));
}

export async function questionsForApplication(applicationId: string) {
  const ctx = await applicationContext(applicationId);
  if (!ctx) return [];
  const setId = pickQuestionSetId(await activeAssignments(), ctx);
  const [setRows, extraRows] = await Promise.all([
    setId
      ? sql("select * from questions where question_set_id = $1 and is_active order by sort_order, key", [setId])
      : Promise.resolve([]),
    sql("select * from questions where application_id = $1 and is_active order by sort_order, key", [applicationId]),
  ]);
  return [...setRows, ...extraRows].map(toQuestion).sort((a, b) => a.sortOrder - b.sortOrder || a.key.localeCompare(b.key));
}

export async function listAnswers(applicationId: string) {
  const rows = await sql("select * from application_answers where application_id = $1", [applicationId]);
  return rows.map(toAnswer);
}

export async function applicationQuestionsComplete(applicationId: string) {
  const questions = await questionsForApplication(applicationId);
  if (!questions.length) return true;
  return isQuestionnaireComplete(questions, await listAnswers(applicationId));
}

export async function staffQuestionnaire(applicationId: string) {
  const active = await questionsForApplication(applicationId);
  const answers = await listAnswers(applicationId);
  const known = active.map((question) => question.id);
  const archived = await sql(
    `select q.* from questions q
     join application_answers a on a.question_id = q.id and a.application_id = $1
     where not (q.id = any($2::uuid[]))
     order by q.sort_order, q.key`,
    [applicationId, known],
  );
  return {
    questions: [...active, ...archived.map(toQuestion)],
    answers,
    missingIds: missingRequired(active, answers).map((question) => question.id),
  };
}

export async function saveAnswerText(applicationId: string, question: Question, text: string | null, values: string[] | null) {
  if (text == null && values == null) {
    await sql(
      `update application_answers set value_text = null, value_json = null, updated_at = now()
       where application_id = $1 and question_id = $2`,
      [applicationId, question.id],
    );
    await sql(
      `delete from application_answers
       where application_id = $1 and question_id = $2 and file_path is null and value_text is null and value_json is null`,
      [applicationId, question.id],
    );
    return;
  }
  await sql(
    `insert into application_answers (application_id, question_id, value_text, value_json)
     values ($1, $2, $3, $4::jsonb)
     on conflict (application_id, question_id) do update
       set value_text = excluded.value_text, value_json = excluded.value_json, updated_at = now()`,
    [applicationId, question.id, text, values ? JSON.stringify(values) : null],
  );
}

export async function saveAnswerFile(
  applicationId: string,
  questionId: string,
  file: { path: string; name: string; mime: string; size: number },
) {
  const previous = await one<{ file_path: string | null }>(
    "select file_path from application_answers where application_id = $1 and question_id = $2",
    [applicationId, questionId],
  );
  await sql(
    `insert into application_answers (application_id, question_id, file_path, file_name, file_mime, file_size)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (application_id, question_id) do update
       set file_path = excluded.file_path, file_name = excluded.file_name, file_mime = excluded.file_mime,
           file_size = excluded.file_size, updated_at = now()`,
    [applicationId, questionId, file.path, file.name, file.mime, file.size],
  );
  return previous?.file_path && previous.file_path !== file.path ? previous.file_path : null;
}

export async function clearAnswerFile(applicationId: string, questionId: string) {
  const previous = await one<{ file_path: string | null }>(
    "select file_path from application_answers where application_id = $1 and question_id = $2",
    [applicationId, questionId],
  );
  await sql(
    `update application_answers
     set file_path = null, file_name = null, file_mime = null, file_size = null, updated_at = now()
     where application_id = $1 and question_id = $2`,
    [applicationId, questionId],
  );
  await sql(
    `delete from application_answers
     where application_id = $1 and question_id = $2 and file_path is null and value_text is null and value_json is null`,
    [applicationId, questionId],
  );
  return previous?.file_path ?? null;
}

const draftErrors: Record<string, string> = {
  too_many: "الحد الأقصى 80 سؤالاً في المجموعة.",
  id: "معرّف السؤال غير صالح.",
  key: "مفتاح السؤال يجب أن يبدأ بحرف إنجليزي ويحتوي على أحرف صغيرة أو أرقام أو _.",
  duplicate_key: "مفتاح السؤال مكرر.",
  type: "نوع السؤال غير صالح.",
  label: "اكتب نص السؤال بالإنجليزية والعربية.",
  help: "نص المساعدة أطول من المسموح.",
  options: "أضف خيارين على الأقل، بالإنجليزية والعربية، بمفتاح إنجليزي فريد.",
  condition: "شرط الإظهار يشير إلى سؤال غير موجود.",
  cycle: "شروط الإظهار تدور حول نفسها.",
  destination: "اختر وجهة للربط.",
  option: "نوع التأشيرة المحدد غير صالح.",
  scope: "لا تجمع بين منتج تأشيرة ونوع تأشيرة في نفس الربط.",
  duplicate_scope: "نفس الوجهة ونوع التأشيرة مكرران.",
};

export async function saveQuestionSet(
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
  const name = input.name.trim();
  const nameAr = input.nameAr.trim();
  if (!name || !nameAr || name.length > 160 || nameAr.length > 160) {
    return { ok: false as const, error: "اكتب اسم المجموعة بالإنجليزية والعربية." };
  }
  const questionError = questionDraftError(input.questions);
  if (questionError) return { ok: false as const, error: draftErrors[questionError] ?? "تعذر حفظ الأسئلة." };
  const assignmentError = assignmentDraftError(input.assignments);
  if (assignmentError) return { ok: false as const, error: draftErrors[assignmentError] ?? "تعذر حفظ الربط." };

  const destinations = input.assignments.length
    ? await sql<{ id: string }>("select id from destinations where id = any($1::uuid[])", [
        input.assignments.map((item) => item.destinationId),
      ])
    : [];
  const knownDestinations = new Set(destinations.map((row) => String(row.id)));
  if (input.assignments.some((item) => !knownDestinations.has(item.destinationId))) {
    return { ok: false as const, error: "إحدى الوجهات لم تعد موجودة." };
  }
  for (const assignment of input.assignments) {
    if (!assignment.visaOptionId) continue;
    const option = await one<{ destination_id: string }>("select destination_id from visa_options where id = $1", [assignment.visaOptionId]);
    if (!option || String(option.destination_id) !== assignment.destinationId) {
      return { ok: false as const, error: "منتج التأشيرة لا يتبع الوجهة المختارة." };
    }
  }
  for (const assignment of input.assignments) {
    const clash = await one(
      `select s.name
       from question_set_assignments a
       join question_sets s on s.id = a.question_set_id
       where a.question_set_id <> $1
         and a.destination_id = $2
         and coalesce(a.visa_option_id, '00000000-0000-0000-0000-000000000000'::uuid) = coalesce($3::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
         and coalesce(a.visa_type, '') = coalesce($4, '')`,
      [id, assignment.destinationId, assignment.visaOptionId, assignment.visaType],
    );
    if (clash) return { ok: false as const, error: `هذا النطاق مربوط بالمجموعة «${String(clash.name)}».` };
  }

  const db = await getDb();
  await db.transaction(async (tx) => {
    const updated = await tx.query("update question_sets set name = $2, name_ar = $3, description = $4, description_ar = $5, is_active = $6, updated_at = now() where id = $1 returning id", [
      id,
      name,
      nameAr,
      input.description.trim() || null,
      input.descriptionAr.trim() || null,
      input.isActive,
    ]);
    if (!updated.length) throw new Error("missing set");
    const existing = await tx.query<{ id: string }>("select id from questions where question_set_id = $1", [id]);
    const keep = new Set(input.questions.map((question) => question.id));
    for (const row of existing) {
      if (keep.has(String(row.id))) continue;
      const answered = await tx.query("select 1 from application_answers where question_id = $1 limit 1", [row.id]);
      if (answered.length) {
        await tx.query("update questions set is_active = false, updated_at = now() where id = $1", [row.id]);
      } else {
        await tx.query("delete from questions where id = $1", [row.id]);
      }
    }
    for (const question of input.questions) {
      const params = [
        question.id,
        id,
        question.key,
        question.type,
        question.label.trim(),
        question.labelAr.trim(),
        question.helpText.trim() || null,
        question.helpTextAr.trim() || null,
        question.required,
        question.sortOrder,
        JSON.stringify(question.options),
        question.showIf ? JSON.stringify(question.showIf) : null,
      ];
      const owned = await tx.query("update questions set key = $3, type = $4, label = $5, label_ar = $6, help_text = $7, help_text_ar = $8, required = $9, sort_order = $10, options = $11::jsonb, show_if = $12::jsonb, is_active = true, updated_at = now() where id = $1 and question_set_id = $2 returning id", params);
      if (owned.length) continue;
      const elsewhere = await tx.query("select id from questions where id = $1", [question.id]);
      if (elsewhere.length) throw new Error("question id taken");
      await tx.query(
        `insert into questions (
           id, question_set_id, key, type, label, label_ar, help_text, help_text_ar, required, sort_order, options, show_if
         ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb)`,
        params,
      );
    }
    await tx.query("delete from question_set_assignments where question_set_id = $1", [id]);
    for (const assignment of input.assignments) {
      await tx.query(
        `insert into question_set_assignments (question_set_id, destination_id, visa_option_id, visa_type)
         values ($1, $2, $3, $4)`,
        [id, assignment.destinationId, assignment.visaOptionId, assignment.visaType],
      );
    }
  });
  return { ok: true as const };
}

export async function addApplicationQuestion(
  applicationId: string,
  draft: QuestionDraft,
  existing: Question[],
) {
  const error = questionDraftError([...existing.map(toDraft), draft]);
  if (error) return { ok: false as const, error: draftErrors[error] ?? "تعذر إضافة السؤال." };
  const row = await one<{ sort: number }>(
    "select coalesce(max(sort_order), 1000) + 10 as sort from questions where application_id = $1",
    [applicationId],
  );
  await sql(
    `insert into questions (
       id, application_id, key, type, label, label_ar, help_text, help_text_ar, required, sort_order, options, show_if
     ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb)`,
    [
      draft.id,
      applicationId,
      draft.key,
      draft.type,
      draft.label.trim(),
      draft.labelAr.trim(),
      draft.helpText.trim() || null,
      draft.helpTextAr.trim() || null,
      draft.required,
      num(row?.sort) || 1010,
      JSON.stringify(draft.options),
      draft.showIf ? JSON.stringify(draft.showIf) : null,
    ],
  );
  return { ok: true as const };
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

export async function removeApplicationQuestion(applicationId: string, questionId: string) {
  if (!isUuid(questionId)) return;
  const answered = await one("select 1 from application_answers where question_id = $1 limit 1", [questionId]);
  if (answered) {
    await sql("update questions set is_active = false, updated_at = now() where id = $1 and application_id = $2", [questionId, applicationId]);
    return;
  }
  await sql("delete from questions where id = $1 and application_id = $2", [questionId, applicationId]);
}

export function answerInputError(question: Question, input: { text?: string | null; values?: string[] | null }) {
  const parsed = parseAnswerInput(question, input);
  if (!parsed.ok) return "invalid" as const;
  return null;
}

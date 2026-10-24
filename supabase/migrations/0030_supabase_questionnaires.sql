-- Supabase-only. The Next.js server uses DATABASE_URL and bypasses these policies.
-- Direct Data API access is limited to admins, plus applicants reading their own answers.

alter table question_sets enable row level security;
alter table question_set_assignments enable row level security;
alter table questions enable row level security;
alter table application_answers enable row level security;
alter table questionnaire_seeds enable row level security;

drop policy if exists question_sets_admin on question_sets;
create policy question_sets_admin on question_sets for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists question_set_assignments_admin on question_set_assignments;
create policy question_set_assignments_admin on question_set_assignments for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists questions_admin on questions;
create policy questions_admin on questions for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists questions_owner_read on questions;
create policy questions_owner_read on questions for select using (
  application_id is not null and public.owns_application(application_id)
);

drop policy if exists application_answers_admin on application_answers;
create policy application_answers_admin on application_answers for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists application_answers_owner_read on application_answers;
create policy application_answers_owner_read on application_answers for select using (public.owns_application(application_id));

drop policy if exists questionnaire_seeds_admin on questionnaire_seeds;
create policy questionnaire_seeds_admin on questionnaire_seeds for all using (public.is_admin()) with check (public.is_admin());

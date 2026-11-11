-- Allow a date answer on visa questions. Safe to re-run.

do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'visa_questions'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%yes_no%';
  if constraint_name is not null then
    execute format('alter table visa_questions drop constraint %I', constraint_name);
  end if;
end $$;

alter table visa_questions drop constraint if exists visa_questions_kind_check;
alter table visa_questions add constraint visa_questions_kind_check
  check (kind in ('yes_no', 'single', 'text', 'date'));

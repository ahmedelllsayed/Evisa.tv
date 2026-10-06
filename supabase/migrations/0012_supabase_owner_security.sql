-- Supabase-only. Tightens Data API access before the project keys are turned on.
-- The Next.js server uses DATABASE_URL and bypasses RLS; these policies cover the anon and authenticated keys.

drop policy if exists applications_owner_insert on applications;
create policy applications_owner_insert on applications for insert with check (
  user_id = auth.uid()
  and status = 'draft'
  and paid_at is null
  and traveler_count >= 1
  and exists (
    select 1 from destinations d
    where d.id = destination_id
      and d.is_active
      and d.visa_required
      and gov_fee = d.gov_fee * traveler_count
      and service_fee = (d.service_fee + case when express then coalesce(d.express_fee, 0) else 0 end) * traveler_count
      and total_amount = gov_fee + service_fee
      and btrim(currency) = btrim(d.currency)
  )
);

drop policy if exists travelers_owner_write on travelers;
create policy travelers_owner_write on travelers for all
  using (
    public.owns_application(application_id)
    and exists (
      select 1 from applications a
      where a.id = application_id
        and a.status in ('draft', 'payment_pending')
    )
  )
  with check (
    public.owns_application(application_id)
    and exists (
      select 1 from applications a
      where a.id = application_id
        and a.status in ('draft', 'payment_pending')
    )
  );

drop policy if exists application_events_owner_read on application_events;
create policy application_events_owner_read on application_events for select using (
  public.is_admin()
  or (public.owns_application(application_id) and internal = false)
);

alter table profile_documents enable row level security;

revoke all on table public.profile_documents from public, anon;
grant select, insert, update, delete on table public.profile_documents to authenticated;

drop policy if exists profile_documents_select on profile_documents;
create policy profile_documents_select on profile_documents
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists profile_documents_insert on profile_documents;
create policy profile_documents_insert on profile_documents
  for insert with check (
    user_id = auth.uid()
    and kind <> 'issued_visa'
    and storage_path like (auth.uid()::text || '/%')
  );

drop policy if exists profile_documents_update on profile_documents;
create policy profile_documents_update on profile_documents
  for update using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and kind <> 'issued_visa'
    and storage_path like (auth.uid()::text || '/%')
  );

drop policy if exists profile_documents_delete on profile_documents;
create policy profile_documents_delete on profile_documents
  for delete using (user_id = auth.uid());

drop policy if exists profile_documents_admin on profile_documents;
create policy profile_documents_admin on profile_documents
  for all using (public.is_admin()) with check (public.is_admin());

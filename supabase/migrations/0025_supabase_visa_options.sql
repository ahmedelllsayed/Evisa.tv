-- Supabase-only. Skipped when the auth schema is missing.

alter table visa_options enable row level security;

drop policy if exists visa_options_public_read on visa_options;
create policy visa_options_public_read on visa_options for select using (is_active or public.is_admin());

drop policy if exists visa_options_admin_write on visa_options;
create policy visa_options_admin_write on visa_options for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists applications_owner_insert on applications;
create policy applications_owner_insert on applications for insert with check (
  user_id = auth.uid()
  and status = 'draft'
  and paid_at is null
  and traveler_count >= 1
  and exists (
    select 1 from visa_options o
    join destinations d on d.id = o.destination_id
    where o.id = visa_option_id
      and o.destination_id = destination_id
      and o.is_active
      and d.is_active
      and d.visa_required
      and gov_fee = (case when o.visa_type = 'sticker' and o.embassy_visit then 0 else o.gov_fee end) * traveler_count
      and service_fee = (o.service_fee + case when express then coalesce(o.express_fee, 0) else 0 end) * traveler_count
      and total_amount = gov_fee + service_fee
      and btrim(currency) = btrim(d.currency)
  )
);

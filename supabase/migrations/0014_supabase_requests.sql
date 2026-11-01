-- Supabase-only policies for the request tables. The Next.js server uses DATABASE_URL and bypasses RLS.

alter table refund_requests enable row level security;
alter table contact_messages enable row level security;

revoke all on table public.refund_requests from public, anon;
revoke all on table public.contact_messages from public, anon;
grant select, insert on table public.refund_requests to authenticated;
grant select, update, delete on table public.contact_messages to authenticated;

drop policy if exists refund_requests_select on refund_requests;
create policy refund_requests_select on refund_requests
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists refund_requests_insert on refund_requests;
create policy refund_requests_insert on refund_requests
  for insert with check (
    user_id = auth.uid()
    and status = 'open'
    and exists (
      select 1 from applications a
      where a.id = application_id
        and a.user_id = auth.uid()
        and a.paid_at is not null
        and a.status <> 'refunded'
    )
  );

drop policy if exists refund_requests_admin on refund_requests;
create policy refund_requests_admin on refund_requests
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists contact_messages_admin_read on contact_messages;
create policy contact_messages_admin_read on contact_messages
  for select using (public.is_admin());

drop policy if exists contact_messages_admin_write on contact_messages;
create policy contact_messages_admin_write on contact_messages
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists contact_messages_admin_delete on contact_messages;
create policy contact_messages_admin_delete on contact_messages
  for delete using (public.is_admin());

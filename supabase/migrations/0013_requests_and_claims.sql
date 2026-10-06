-- Customer requests, removal of invented fee history, and one-time FAQ corrections.
-- FAQ updates match the previous seeded answer exactly, so an edited row is left alone.

create table if not exists refund_requests (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  unique (application_id)
);

create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  topic text,
  body text not null,
  created_at timestamptz not null default now()
);

delete from fee_changes where reason in ('Government fee reduced', 'Exchange rate update');

insert into pages (slug, template, title, published, sort_order)
values ('editorial-policy', 'prose', 'Editorial policy', true, 160)
on conflict (slug) do nothing;

update faqs set answer = $$Pick your departure date, add travellers, upload the passport and photo, review, and pay. Our team then reviews the file. Filing with the authority is a manual step in the admin console, not an automatic government submission.$$
where question = $$How do I apply for a {country} visa online?$$
  and answer = $$Pick your departure date, add travellers, upload the passport and photo, review, and pay. Atlys fills the government forms, checks your documents and submits the application for you.$$;

update faqs set answer = $$Sign in and open your application. You will see the status our team sets, including document checks. There is no live feed from the government.$$
where question = $$How can I track my {country} visa application?$$
  and answer = $$Sign in and open your application. Every step, from document checks to government processing, is shown live with a timestamp.$$;

update faqs set answer = $$If the file is still open after the guaranteed date, request a refund from your account. A staff member reviews the request. It is not issued automatically.$$
where question = $$What happens if my {country} visa is late?$$
  and answer = $$If your visa arrives after the guaranteed date, the Atlys service fee is refunded in full. That is the On Time Guarantee.$$;

update faqs set answer = $$A refusal does not automatically refund the fee. Request a review from your account. Rejection notes appear on a destination only when they have been entered for that country.$$
where question = $$What if my {country} visa is rejected?$$
  and answer = $$We build a free re-application strategy with you. If the route is covered and the visa is rejected again, you get every pound back.$$;

update faqs set answer = $$Every visa shows a target date before you pay. If that date passes while the file is still open, you can request a refund from your account. Staff review the request.$$
where question = $$What does “Visas on time, guaranteed” mean?$$
  and answer = $$Every visa shows a guaranteed delivery date before you pay. If your visa arrives after that date, the Atlys service fee is refunded in full.$$;

update faqs set answer = $$A refusal does not automatically refund the fee. You can request a review from your account, and a staff member decides.$$
where question = $$What happens if my visa is denied?$$
  and answer = $$We build a free re-application strategy with you. If it is denied again, you get every pound back.$$;

update faqs set answer = $$You can request a refund from your account before the application is marked filed. A staff member approves or declines it. There is no automatic refund.$$
where question = $$Do you give refunds?$$
  and answer = $$Yes. Our refund policy is public and stage-by-stage. If your application has not been filed to the government yet, you are eligible for a 100% refund.$$;

update faqs set answer = $$A rejection does not by itself refund the government or service fee. Request a review from your account and our team decides.$$
where question = $$Do I get a refund if my visa is rejected?$$
  and answer = $$Yes, for all destinations covered by our rejection protection. If your application is rejected on an eligible route, you receive a 100% refund of the government and service fees.$$;

update faqs set answer = $$Request a refund from your account before the application is marked filed. There is no instant account credit. After a person marks the file as filed, the fee is no longer refunded from this site.$$
where question = $$Can I get a refund if I cancel my application?$$
  and answer = $$If your application has not been submitted to the government, you get a 100% refund as account credit, issued instantly. Once submitted, governments do not allow withdrawals, so refunds are no longer possible.$$;

update faqs set answer = $$If we cancel the application before it is marked filed, you can request a refund and a staff member can send it back to the card.$$
where question = $$What if you cancel my application?$$
  and answer = $$If we cancel your application before it is filed (for example, due to insufficient documents), you receive a 100% refund.$$;

update faqs set answer = $$After a staff member approves the request, a card refund depends on the payment provider and can take several working days. Nothing is credited instantly inside the account.$$
where question = $$How long does a refund take?$$
  and answer = $$Refunds are processed instantly. Credits appear immediately in your account; refunds to your card take up to 5 working days to reach your bank.$$;

update faqs set answer = $$The amount you pay is the government fee plus the service fee shown before checkout.$$
where question = $$Are there hidden fees?$$
  and answer = $$No. Every charge is broken down before you pay: the government fee, the service fee and any taxes. If exchange rates drop before submission, we refund the difference.$$;

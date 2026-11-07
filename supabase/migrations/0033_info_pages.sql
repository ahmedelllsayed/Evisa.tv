insert into pages (slug, template, title, published, sort_order)
values ('security', 'prose', 'Security', true, 170),
       ('events', 'events', 'Events', true, 180)
on conflict (slug) do nothing;

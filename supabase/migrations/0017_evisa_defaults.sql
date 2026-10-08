-- Replace leftover Atlys contact defaults only when the row still has those values.

update site_settings set
  name = case when name = 'Atlys' then 'Evisa' else name end,
  legal_name = case when legal_name = 'Atlys, Inc.' then 'Evisa' else legal_name end,
  description = case
    when description = 'Atlys helps you plan, apply, and track visas seamlessly across the world.'
      then 'Evisa helps you plan, apply, and track visas.'
    else description
  end,
  general_email = case when general_email = 'help@atlys.com' then 'help@evisa.tv' else general_email end,
  support_email = case when support_email = 'support@atlys.com' then 'support@evisa.tv' else support_email end,
  press_email = case when press_email = 'pr@atlys.com' then 'pr@evisa.tv' else press_email end,
  partnerships_email = case when partnerships_email = 'partnerships@atlys.com' then 'partnerships@evisa.tv' else partnerships_email end,
  phone = case when phone = '+1 607-208-2132' then '' else phone end,
  whatsapp = case when whatsapp = 'https://wa.me/16072082132' then '' else whatsapp end,
  offices = case
    when offices::text like '%New York%' and offices::text like '%Dubai%' and offices::text like '%Delhi%'
      then '[]'::jsonb
    else offices
  end,
  updated_at = now()
where id = 1
  and (
    name = 'Atlys'
    or general_email = 'help@atlys.com'
    or support_email = 'support@atlys.com'
    or press_email = 'pr@atlys.com'
    or partnerships_email = 'partnerships@atlys.com'
    or phone = '+1 607-208-2132'
    or whatsapp = 'https://wa.me/16072082132'
  );

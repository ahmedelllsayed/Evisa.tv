update site_settings
set extras = coalesce(extras, '{}'::jsonb) || jsonb_build_object(
      'reservationInsuranceOn', true,
      'reservationInsuranceFee', case
        when coalesce((extras->>'reservationInsuranceFee')::numeric, 0) = 0 then 149
        else (extras->>'reservationInsuranceFee')::numeric
      end,
      'reservationInsuranceRestored', true
    ),
    updated_at = now()
where id = 1
  and coalesce(extras->>'reservationInsuranceRestored', '') <> 'true';

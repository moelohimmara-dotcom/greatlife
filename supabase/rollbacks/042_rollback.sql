-- Greatlife — Rollback 042 : restaurer pickupTimes dans email_templates
-- =====================================================================
-- Remet les créneaux sous email_templates (forme 024) et les retire de
-- restaurant + site_config. Le panier redevient dépendant du code / de
-- l’ancienne clé jusqu’à une republie.

DO $$
DECLARE
  depuis_restaurant jsonb;
  defaut jsonb := '["12:00","12:30","13:00","13:30","14:00","19:00","19:30","20:00","20:30","21:00"]'::jsonb;
  choisi jsonb;
BEGIN
  SELECT value -> 'pickupTimes' INTO depuis_restaurant
  FROM public.site_content
  WHERE key = 'restaurant';

  IF depuis_restaurant IS NOT NULL
     AND jsonb_typeof(depuis_restaurant) = 'array'
     AND jsonb_array_length(depuis_restaurant) > 0 THEN
    choisi := depuis_restaurant;
  ELSE
    choisi := defaut;
  END IF;

  UPDATE public.site_content
  SET
    value = coalesce(value, '{}'::jsonb) || jsonb_build_object('pickupTimes', choisi),
    updated_at = now()
  WHERE key = 'email_templates';

  UPDATE public.site_content
  SET
    value = value - 'pickupTimes',
    updated_at = now()
  WHERE key = 'restaurant'
    AND value ? 'pickupTimes';

  UPDATE public.site_content
  SET
    value = value - 'pickupTimes',
    updated_at = now()
  WHERE key = 'site_config'
    AND value ? 'pickupTimes';

  RAISE NOTICE 'Rollback 042 : pickupTimes rendu à email_templates';
END
$$;

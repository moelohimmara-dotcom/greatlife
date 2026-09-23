-- Greatlife — Migration 042 : créneaux de retrait sur restaurant (J5)
-- =================================================================
-- Décision schéma : source UNIQUE = site_content.restaurant.pickupTimes
-- (liste éditable dans Réglages → Horaires). Les horaires texte restent
-- distincts. Pas de nouvelle table.
--
-- Historique : migration 024 avait semé pickupTimes dans email_templates
-- (jamais branché au panier). On les déplace vers restaurant, avec repli
-- sur l’ancienne liste hardcodée d’OrderCart si la source est vide.
-- Miroir plat site_config.pickupTimes pour l’éditeur (écriture par domaine).
--
-- Réversible : supabase/rollbacks/042_rollback.sql

DO $$
DECLARE
  defaut jsonb := '["12:00","12:30","13:00","13:30","14:00","19:00","19:30","20:00","20:30","21:00"]'::jsonb;
  depuis_templates jsonb;
  actuel jsonb;
  choisi jsonb;
  cfg jsonb;
BEGIN
  SELECT value -> 'pickupTimes' INTO depuis_templates
  FROM public.site_content
  WHERE key = 'email_templates';

  SELECT value -> 'pickupTimes' INTO actuel
  FROM public.site_content
  WHERE key = 'restaurant';

  IF actuel IS NOT NULL
     AND jsonb_typeof(actuel) = 'array'
     AND jsonb_array_length(actuel) > 0 THEN
    choisi := actuel;
  ELSIF depuis_templates IS NOT NULL
     AND jsonb_typeof(depuis_templates) = 'array'
     AND jsonb_array_length(depuis_templates) > 0 THEN
    choisi := depuis_templates;
  ELSE
    choisi := defaut;
  END IF;

  UPDATE public.site_content
  SET
    value = coalesce(value, '{}'::jsonb) || jsonb_build_object('pickupTimes', choisi),
    updated_at = now()
  WHERE key = 'restaurant';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Migration 042 : ligne restaurant introuvable';
  END IF;

  -- Miroir plat pour l’écran Réglages (site_config racine).
  SELECT value INTO cfg FROM public.site_content WHERE key = 'site_config';
  IF cfg IS NULL THEN
    RAISE EXCEPTION 'Migration 042 : ligne site_config introuvable';
  END IF;

  UPDATE public.site_content
  SET
    value = cfg || jsonb_build_object('pickupTimes', choisi),
    updated_at = now()
  WHERE key = 'site_config';

  -- Retirer la clé orpheline des gabarits e-mail (créneaux ≠ e-mails).
  UPDATE public.site_content
  SET
    value = value - 'pickupTimes',
    updated_at = now()
  WHERE key = 'email_templates'
    AND value ? 'pickupTimes';

  RAISE NOTICE 'Migration 042 : pickupTimes → restaurant (% créneaux)', jsonb_array_length(choisi);
END
$$;

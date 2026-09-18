-- Greatlife — Migration 024 : reglages dans des lignes separees
-- =================================================================
-- Lot 1 — Fondations CMS (docs/12_DATABASE_SCHEMA.md §4).
--
-- OBJECTIF : rendre les reglages du restaurant disponibles au nouveau modele
-- SANS TOUCHER a la ligne historique `site_config`.
--
-- POURQUOI NE PAS RESTRUCTURER `site_config` :
--   `saveSiteConfig()` (src/lib/repository.ts:170-183) ecrit l'INTEGRALITE du
--   champ `value` en un seul upsert, a partir d'un objet reconstruit cote client
--   { content, themeId, fontId, visibility, rbacOverrides }. Tout clic
--   « Enregistrer » dans les modules Theme / Visibilite / Utilisateurs reecrit
--   donc la ligne entiere et effacerait sans erreur toute cle inconnue.
--   Restructurer serait detruit a la premiere edition admin.
--
-- Les nouvelles cles sont donc des LIGNES SEPAREES : hors de portee de cet upsert.
--
-- Idempotente (ON CONFLICT (key) DO NOTHING).
-- Reversible par : supabase/rollbacks/024_rollback.sql

-- ---------------------------------------------------------------- restaurant
-- Champs traduisibles en objet { "fr": … } (decision CM-1) ; les champs
-- non traduisibles (telephone, emails, devise) restent des chaines simples.
-- Le contenu source est extrait dans une sous-requete : `site_config.content`.
INSERT INTO public.site_content (key, value)
SELECT
  'restaurant',
  jsonb_build_object(
    'name',             jsonb_build_object('fr', coalesce(src.c->>'restaurantName', 'Greatlife')),
    'slogan',           jsonb_build_object('fr', coalesce(src.c->>'slogan', '')),
    'address',          jsonb_build_object('fr', coalesce(src.c->>'address', '')),
    'hours',            jsonb_build_object('fr', coalesce(src.c->>'hours', '')),
    'phone',            coalesce(src.c->>'phone', ''),
    'emailContact',     coalesce(src.c->>'emailContact', ''),
    'emailReservation', coalesce(src.c->>'emailReservation', ''),
    'currency',         coalesce(src.c->>'currency', 'FG'),
    'social',           jsonb_build_object(
                          'facebook',  coalesce(src.c->>'socialFacebook', ''),
                          'instagram', coalesce(src.c->>'socialInstagram', ''),
                          'whatsapp',  coalesce(src.c->>'socialWhatsapp', '')
                        )
  )
FROM (
  SELECT value -> 'content' AS c
  FROM public.site_content
  WHERE key = 'site_config' AND value ? 'content'
) AS src
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------- email_templates
-- Reprend `autoReply` (gabarit de reponse automatique) et y ajoute les horaires
-- de retrait, jusque-la codes en dur dans OrderCart.tsx:13.
INSERT INTO public.site_content (key, value)
SELECT
  'email_templates',
  jsonb_build_object(
    'contactAutoReply', jsonb_build_object('fr', coalesce(src.c->>'autoReply', '')),
    'pickupTimes',      jsonb_build_array('12:00','12:30','13:00','13:30','14:00',
                                          '19:00','19:30','20:00','20:30','21:00')
  )
FROM (
  SELECT value -> 'content' AS c
  FROM public.site_content
  WHERE key = 'site_config' AND value ? 'content'
) AS src
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------- controle
-- La ligne historique doit etre STRICTEMENT intacte.
DO $$
DECLARE
  nb_restaurant int;
  nb_templates  int;
  nb_content    int;
BEGIN
  SELECT count(*) INTO nb_restaurant FROM public.site_content WHERE key = 'restaurant';
  SELECT count(*) INTO nb_templates  FROM public.site_content WHERE key = 'email_templates';
  SELECT count(*) INTO nb_content    FROM public.site_content
    WHERE key = 'site_config' AND value ? 'content';

  IF nb_restaurant <> 1 OR nb_templates <> 1 THEN
    RAISE EXCEPTION 'Migration 024 : les nouvelles cles sont absentes (restaurant=%, templates=%)',
      nb_restaurant, nb_templates;
  END IF;

  IF nb_content <> 1 THEN
    RAISE EXCEPTION 'Migration 024 : la ligne historique site_config a ete alteree !';
  END IF;

  RAISE NOTICE 'Migration 024 : OK (reglages ajoutes, ligne historique intacte)';
END
$$;

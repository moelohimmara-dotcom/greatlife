-- Greatlife — Migration 045 : table dédiée aux surcharges RBAC (B-S1)
-- =====================================================================
-- Problème : les surcharges de la matrice d'accès vivaient dans
-- `site_content` (clé `site_config`), lisible par tout visiteur anonyme
-- via `content_public_read`. Qui a droit à quoi fuyait vers le public.
--
-- Solution : table `rbac_overrides` SANS lecture anonyme (console
-- authentifiée uniquement), reprise des valeurs existantes, puis
-- suppression de la clé publique (ferme la fuite immédiatement).
-- L'application garde une lecture de repli sur `site_config` au cas où
-- la migration ne serait pas encore appliquée.

CREATE TABLE IF NOT EXISTS public.rbac_overrides (
  key text PRIMARY KEY DEFAULT 'global',
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rbac_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rbac_overrides_admin_read" ON public.rbac_overrides;
CREATE POLICY "rbac_overrides_admin_read" ON public.rbac_overrides
  FOR SELECT TO authenticated
  USING (public.is_admin(ARRAY['owner', 'manager', 'chef', 'editor', 'marketing', 'guest']));

DROP POLICY IF EXISTS "rbac_overrides_owner_write" ON public.rbac_overrides;
CREATE POLICY "rbac_overrides_owner_write" ON public.rbac_overrides
  FOR ALL TO authenticated
  USING (public.is_admin(ARRAY['owner']))
  WITH CHECK (public.is_admin(ARRAY['owner']));

-- Reprise : adopter les surcharges existantes (une seule fois)…
INSERT INTO public.rbac_overrides (key, value)
SELECT 'global', value->'rbacOverrides'
FROM public.site_content
WHERE key = 'site_config' AND (value ? 'rbacOverrides')
ON CONFLICT (key) DO NOTHING;

-- …puis fermer la fuite : la clé publique disparaît.
UPDATE public.site_content
SET value = value - 'rbacOverrides', updated_at = now()
WHERE key = 'site_config' AND (value ? 'rbacOverrides');

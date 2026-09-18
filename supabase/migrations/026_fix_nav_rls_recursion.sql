-- Greatlife — Migration 026 : correctif de recursion RLS sur navigation_items
-- ============================================================================
-- DEFAUT CORRIGE (releve par la revue finale du Lot 1) :
--
--   La policy `nav_items_public_read` (migration 022) interrogeait
--   `public.navigation_items` DEPUIS sa propre policy, pour verifier que le
--   parent est visible. Postgres refuse ce motif :
--
--     ERROR 42P17: infinite recursion detected in policy for relation "navigation_items"
--
--   Verifie en conditions reelles sur la base : une lecture publique de
--   `navigation_items` renvoyait HTTP 500. Le defaut etait LATENT : aucun code
--   ne lisait encore cette table, donc ni le typecheck ni le build ne
--   pouvaient le detecter.
--
--   C'est exactement le motif qui avait casse la production une premiere fois
--   (migration 007, `admin_users`), resolu de la meme facon : une fonction
--   SECURITY DEFINER qui contourne la RLS pour la verification interne.
--
-- Idempotente. Reversible par : supabase/rollbacks/026_rollback.sql

-- ---------------------------------------------------------------- correctif
-- Verification d'accessibilite publique d'une entree de navigation.
-- SECURITY DEFINER : la lecture interne ne redéclenche pas les policies.
CREATE OR REPLACE FUNCTION public.nav_item_is_public(
  item_parent_id      uuid,
  item_target_type    text,
  item_target_page_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Un sous-item n'est public que si son parent l'est aussi.
    (
      item_parent_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.navigation_items parent
        WHERE parent.id = item_parent_id
          AND parent.visible = true
      )
    )
    -- Une cible de type « page » ne doit apparaitre que si la page est publiee,
    -- sinon la navigation publique contient un lien mort vers un brouillon.
    AND (
      item_target_type <> 'page'
      OR item_target_page_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.pages p
        WHERE p.id = item_target_page_id
          AND p.status = 'published'
      )
    )
$$;

DROP POLICY IF EXISTS "nav_items_public_read" ON public.navigation_items;
CREATE POLICY "nav_items_public_read" ON public.navigation_items
  FOR SELECT TO anon, authenticated
  USING (
    visible = true
    AND public.nav_item_is_public(parent_id, target_type, target_page_id)
  );

-- Plancher de securite : sans policy de lecture publique fonctionnelle, la
-- navigation publique serait vide. Ce controle echoue bruyamment si la policy
-- n'a pas ete creee.
DO $$
DECLARE
  nb_policies int;
BEGIN
  SELECT count(*) INTO nb_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'navigation_items'
    AND policyname = 'nav_items_public_read';

  IF nb_policies <> 1 THEN
    RAISE EXCEPTION 'Migration 026 : la policy de lecture publique est absente';
  END IF;

  RAISE NOTICE 'Migration 026 : recursion RLS corrigee';
END
$$;

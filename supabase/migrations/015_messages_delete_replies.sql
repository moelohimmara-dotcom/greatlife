-- Greatlife — Migration 015 : Suppression + historique des réponses pour messages
-- ============================================================================
-- Le panneau admin ne pouvait que lire/marquer les messages. Cette migration
-- ajoute la suppression (RLS DELETE) et une colonne JSONB `replies` pour garder
-- l'historique des réponses envoyées depuis le panneau (date, auteur, contenu).

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS replies JSONB DEFAULT '[]'::jsonb;

DROP POLICY IF EXISTS "messages_admin_delete" ON public.messages;
CREATE POLICY "messages_admin_delete" ON public.messages
  FOR DELETE TO authenticated
  USING (public.is_admin(ARRAY['owner', 'manager']));

DROP POLICY IF EXISTS "messages_admin_update" ON public.messages;
CREATE POLICY "messages_admin_update" ON public.messages
  FOR UPDATE TO authenticated
  USING (public.is_admin(ARRAY['owner', 'manager']))
  WITH CHECK (public.is_admin(ARRAY['owner', 'manager']));

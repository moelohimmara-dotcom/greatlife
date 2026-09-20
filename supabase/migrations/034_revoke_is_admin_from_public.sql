-- Greatlife — Migration 034 : is_admin n'est plus exécutable par le public
-- ============================================================================
-- POURQUOI
-- `is_admin(text[])` est SECURITY DEFINER. Par défaut Postgres accorde EXECUTE
-- à PUBLIC, donc le rôle `anon` peut l'appeler via `/rest/v1/rpc/is_admin`.
-- Un `REVOKE … FROM anon` seul ne suffit pas : `anon` hérite encore de PUBLIC.
--
-- CE QUE ÇA CHANGE
--   REVOKE FROM PUBLIC, puis GRANT à `authenticated` uniquement.
--   Les policies qui appellent `is_admin()` sont toutes `TO authenticated`
--   (007, 011, 013–015, 017, 021–023). La lecture anonyme n'emprunte pas
--   cette fonction. `nav_item_is_public` n'est pas touchée : la policy
--   publique de navigation (026) en a besoin.
--
-- HORS PÉRIMÈTRE
--   verify_jwt sur send-contact-email : gain quasi nul (clé anon déjà dans le
--   bundle) et risque de casser contact / réservation / commande.
--
-- Idempotente. Réversible par : supabase/rollbacks/034_rollback.sql

REVOKE EXECUTE ON FUNCTION public.is_admin(text[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin(text[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin(text[]) TO authenticated;

-- Greatlife — Migration 019 : application effective du statut « suspendu »
-- =========================================================================
-- Objectif (risque R5 de l'audit) :
--   `is_admin()` ne consultait pas la colonne `admin_users.active`. Une suspension
--   était donc purement cosmétique côté base : un compte suspendu conservait tous
--   ses droits d'écriture tant que son jeton restait valide.
--
-- Contenu :
--   1. `is_admin()` exige désormais `au.active = true`.
--   2. Ajout de la policy `admin_users_self_read` : chaque utilisateur connecté peut
--      lire SA PROPRE ligne `admin_users`. Sans elle, un non-owner ne peut pas voir
--      son propre statut, et la suspension reste invisible pour lui.
--
-- Nature du changement : RESTRICTIF (retire des droits, n'en ajoute aucun).
-- Réversibilité : voir `supabase/rollbacks/019_rollback.sql`.
-- Impact attendu : aucun des 4 comptes existants n'étant suspendu, aucune coupure.

-- 1. is_admin() tient compte du statut actif
CREATE OR REPLACE FUNCTION public.is_admin(role_filter text[])
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.email = auth.jwt() ->> 'email'
      AND au.role = ANY(role_filter)
      AND au.active = true
  )
$function$;

-- 2. Un utilisateur connecté peut lire sa propre ligne (statut inclus)
DROP POLICY IF EXISTS "admin_users_self_read" ON public.admin_users;
CREATE POLICY "admin_users_self_read" ON public.admin_users
  FOR SELECT TO authenticated
  USING (email = auth.jwt() ->> 'email');

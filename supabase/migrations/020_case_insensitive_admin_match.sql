-- Greatlife — Migration 020 : comparaison d'email insensible à la casse
-- ======================================================================
-- Motif (durcissement anti-verrouillage) :
--   `is_admin()` comparait `au.email = auth.jwt() ->> 'email'` en **casse stricte**.
--   Le client normalise l'email en minuscules avant connexion, mais si une ligne de
--   `admin_users` contenait une majuscule, la comparaison échouait : le compte légitime
--   se retrouvait sans rôle, donc **verrouillé sans recours**.
--   Une seule divergence de casse suffisait à bloquer le propriétaire.
--
-- Contenu :
--   1. `is_admin()` compare désormais les emails via `lower()` des deux côtés.
--   2. La policy `admin_users_self_read` fait de même (lecture de sa propre ligne).
--
-- Nature du changement : élargit le rapprochement d'email (aucun droit supplémentaire
-- n'est accordé à un rôle : le contrôle de rôle et de statut `active` est inchangé).
-- Réversibilité : voir `supabase/rollbacks/020_rollback.sql`.

CREATE OR REPLACE FUNCTION public.is_admin(role_filter text[])
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE lower(au.email) = lower(auth.jwt() ->> 'email')
      AND au.role = ANY(role_filter)
      AND au.active = true
  )
$function$;

DROP POLICY IF EXISTS "admin_users_self_read" ON public.admin_users;
CREATE POLICY "admin_users_self_read" ON public.admin_users
  FOR SELECT TO authenticated
  USING (lower(email) = lower(auth.jwt() ->> 'email'));

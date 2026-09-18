-- Rollback de la migration 020_case_insensitive_admin_match.sql
-- ==================================================================
-- Rédigé AVANT l'application de la 020 (TDR §29 : migration réversible).
-- Effet : restaure la comparaison d'email en casse stricte.

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

DROP POLICY IF EXISTS "admin_users_self_read" ON public.admin_users;
CREATE POLICY "admin_users_self_read" ON public.admin_users
  FOR SELECT TO authenticated
  USING (email = auth.jwt() ->> 'email');

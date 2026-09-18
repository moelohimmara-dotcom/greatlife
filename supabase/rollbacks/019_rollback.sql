-- Rollback de la migration 019_security_active_enforcement.sql
-- =================================================================
-- Rédigé AVANT l'application de la 019, conformément à la revue de plan
-- (TDR §29 : prévoir une migration réversible).
--
-- Effet : restaure `is_admin()` dans sa version de la migration 007
-- (sans prise en compte de `active`) et supprime la policy de lecture de soi.

-- 1. Restauration de is_admin() sans condition sur `active` (version 007)
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
  )
$function$;

-- 2. Retrait de la policy de lecture de son propre compte
DROP POLICY IF EXISTS "admin_users_self_read" ON public.admin_users;

-- Greatlife — Rollback de la migration 043
-- ============================================================================
-- Restaure les grants d'avant 043 (état post-039 pour les triggers blog/orders,
-- défaut Postgres pour set_updated_at / nav_item_is_public).

DROP POLICY IF EXISTS "contact_rate_buckets_deny_client" ON public.contact_rate_buckets;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END
$function$;

GRANT EXECUTE ON FUNCTION public.set_updated_at() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.blog_guard_publish() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.orders_reprice_from_menu() TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.nav_item_is_public(uuid, text, uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.nav_item_is_public(uuid, text, uuid)
  TO anon, authenticated, service_role;
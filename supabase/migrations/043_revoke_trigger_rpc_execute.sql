-- Greatlife — Migration 043 : REVOKE EXECUTE des helpers trigger / search_path
-- ============================================================================
-- POURQUOI (Supabase advisors)
--   1. `blog_guard_publish` et `orders_reprice_from_menu` sont SECURITY DEFINER
--      et n'existent que comme fonctions de TRIGGER. Après CREATE, Supabase
--      accorde encore EXECUTE à `anon` / `authenticated` (hors PUBLIC), donc
--      appelables via `/rest/v1/rpc/...`. Inutile et trompeur.
--   2. `set_updated_at` : trigger only + search_path mutable (advisor).
--   3. `contact_rate_buckets` : RLS on, aucune policy → advisor « always deny
--      by default » ; on ajoute un deny-all explicite pour anon/authenticated.
--      L'edge `send-contact-email` utilise service_role (bypass RLS).
--
-- HORS PÉRIMÈTRE / CONSERVÉ
--   `nav_item_is_public(uuid,text,uuid)` : appelée DANS la policy
--   `nav_items_public_read` (026). anon/authenticated DOIVENT garder EXECUTE
--   sinon la nav publique casse. On nettoie seulement PUBLIC → grants explicites.
--
-- SÉCURITÉ TRIGGERS
--   REVOKE EXECUTE n'empêche pas le moteur de triggers de les invoquer
--   (même motif que 039 pour orders_reprice). INSERT commandes / UPDATE blog
--   console inchangés.
--
-- Idempotente. Réversible : supabase/rollbacks/043_rollback.sql

-- ---------------------------------------------------------------------------
-- A. Trigger-only SECURITY DEFINER — plus d'RPC client
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.blog_guard_publish() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.blog_guard_publish() FROM anon;
REVOKE ALL ON FUNCTION public.blog_guard_publish() FROM authenticated;

REVOKE ALL ON FUNCTION public.orders_reprice_from_menu() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.orders_reprice_from_menu() FROM anon;
REVOKE ALL ON FUNCTION public.orders_reprice_from_menu() FROM authenticated;

-- ---------------------------------------------------------------------------
-- B. set_updated_at — search_path figé + plus d'RPC client
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END
$function$;

REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM anon;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM authenticated;

-- ---------------------------------------------------------------------------
-- C. nav_item_is_public — requis par RLS publique ; pas de PUBLIC large
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.nav_item_is_public(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nav_item_is_public(uuid, text, uuid)
  TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- D. contact_rate_buckets — deny-all explicite (service_role bypass RLS)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "contact_rate_buckets_deny_client" ON public.contact_rate_buckets;

CREATE POLICY "contact_rate_buckets_deny_client"
  ON public.contact_rate_buckets
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Renforce le plancher déjà posé en 039 (idempotent).
REVOKE ALL ON TABLE public.contact_rate_buckets FROM PUBLIC, anon, authenticated;
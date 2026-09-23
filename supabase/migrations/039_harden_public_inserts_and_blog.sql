-- Greatlife — Migration 039 : durcissement formulaires publics + blog publish
-- ============================================================================
-- POURQUOI
--   1. messages / reservations : WITH CHECK (true) depuis 010 — spam DB sans
--      bornes (contrairement à orders 037).
--   2. blog : la matrice UI refuse `publish` à `editor`, mais `blog_admin_write`
--      FOR ALL lui laisse poser `published = true` via l'API.
--   3. orders : le total et les prix lignes sont entièrement client — fraude
--      panier (0 FG / prix inventés). Recalcul serveur contre menu_items.
--
-- CE QUE ÇA CHANGE
--   0. Table contact_rate_buckets (quota SMTP edge, sans policy publique).
--   A. Policies INSERT messages / reservations bornées (char_length, statut).
--   B. Policies blog découpées + trigger garde-fou publication.
--   C. Trigger BEFORE INSERT orders : réécrit items/total depuis la carte.
--
-- Idempotente. Réversible : supabase/rollbacks/039_rollback.sql

-- ---------------------------------------------------------------------------
-- 0. Quota SMTP contact (lu/écrit uniquement par l'edge service_role)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.contact_rate_buckets (
  bucket_key   text PRIMARY KEY,
  hits         integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_rate_buckets ENABLE ROW LEVEL SECURITY;
-- Aucune policy : anon/authenticated ne peuvent ni lire ni écrire.
REVOKE ALL ON TABLE public.contact_rate_buckets FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- A. messages / reservations — INSERT public borné
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "messages_public_insert" ON public.messages;

CREATE POLICY "messages_public_insert" ON public.messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(trim(nom)) BETWEEN 1 AND 200
    AND char_length(email) BETWEEN 3 AND 320
    AND char_length(coalesce(sujet, '')) BETWEEN 1 AND 80
    AND char_length(trim(message)) BETWEEN 1 AND 5000
    AND coalesce(handled, false) = false
  );

GRANT INSERT ON TABLE public.messages TO anon, authenticated;

DROP POLICY IF EXISTS "reservations_public_insert" ON public.reservations;

CREATE POLICY "reservations_public_insert" ON public.reservations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'pending'
    AND char_length(trim(nom)) BETWEEN 1 AND 200
    AND char_length(email) BETWEEN 3 AND 320
    AND char_length(coalesce(phone, '')) <= 40
    AND char_length(coalesce("date", '')) BETWEEN 1 AND 40
    AND char_length(coalesce("time", '')) BETWEEN 1 AND 40
    AND guests BETWEEN 1 AND 50
    AND char_length(coalesce(message, '')) <= 2000
  );

GRANT INSERT ON TABLE public.reservations TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- B. blog — editor peut rédiger, seuls owner/manager publient
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "blog_admin_write" ON public.blog_posts;

CREATE POLICY "blog_staff_insert" ON public.blog_posts
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(ARRAY['owner', 'manager', 'editor']));

CREATE POLICY "blog_staff_update" ON public.blog_posts
  FOR UPDATE TO authenticated
  USING (public.is_admin(ARRAY['owner', 'manager', 'editor']))
  WITH CHECK (public.is_admin(ARRAY['owner', 'manager', 'editor']));

CREATE POLICY "blog_staff_delete" ON public.blog_posts
  FOR DELETE TO authenticated
  USING (public.is_admin(ARRAY['owner', 'manager']));

CREATE OR REPLACE FUNCTION public.blog_guard_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.published IS TRUE
       AND NOT public.is_admin(ARRAY['owner', 'manager']) THEN
      RAISE EXCEPTION 'La publication d''un article est réservée au propriétaire et au gérant.';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.published IS DISTINCT FROM OLD.published
       AND NOT public.is_admin(ARRAY['owner', 'manager']) THEN
      RAISE EXCEPTION 'La publication d''un article est réservée au propriétaire et au gérant.';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_blog_guard_publish ON public.blog_posts;
CREATE TRIGGER trg_blog_guard_publish
  BEFORE INSERT OR UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.blog_guard_publish();

REVOKE ALL ON FUNCTION public.blog_guard_publish() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.blog_guard_publish() TO authenticated;

-- ---------------------------------------------------------------------------
-- C. orders — recalcul des prix depuis menu_items
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.orders_reprice_from_menu()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  elem jsonb;
  item_name text;
  item_qty integer;
  catalog_price text;
  unit_num bigint;
  sum_total bigint := 0;
  rebuilt jsonb := '[]'::jsonb;
  digits text;
  formatted text;
BEGIN
  IF jsonb_typeof(NEW.items) IS DISTINCT FROM 'array'
     OR jsonb_array_length(NEW.items) < 1
     OR jsonb_array_length(NEW.items) > 50 THEN
    RAISE EXCEPTION 'Le panier est invalide.';
  END IF;

  FOR elem IN SELECT value FROM jsonb_array_elements(NEW.items) AS t(value)
  LOOP
    item_name := trim(coalesce(elem->>'name', ''));
    BEGIN
      item_qty := coalesce((elem->>'qty')::integer, 0);
    EXCEPTION WHEN others THEN
      item_qty := 0;
    END;

    IF item_name = '' OR item_qty < 1 OR item_qty > 99 THEN
      RAISE EXCEPTION 'Un article de la commande est invalide.';
    END IF;

    SELECT mi.price INTO catalog_price
      FROM public.menu_items mi
     WHERE mi.name = item_name
     LIMIT 1;

    IF catalog_price IS NULL THEN
      RAISE EXCEPTION 'Un article de la commande n''est plus au menu.';
    END IF;

    digits := regexp_replace(catalog_price, '[^0-9]', '', 'g');
    IF digits = '' THEN
      RAISE EXCEPTION 'Le prix d''un article est indisponible.';
    END IF;
    unit_num := digits::bigint;
    IF unit_num <= 0 THEN
      RAISE EXCEPTION 'Le prix d''un article est indisponible.';
    END IF;

    sum_total := sum_total + (unit_num * item_qty);
    rebuilt := rebuilt || jsonb_build_array(
      jsonb_build_object(
        'name', item_name,
        'price', catalog_price,
        'qty', item_qty
      )
    );
  END LOOP;

  IF sum_total <= 0 THEN
    RAISE EXCEPTION 'Le montant de la commande est invalide.';
  END IF;

  -- Groupes de 3 chiffres séparés par un espace (ex. 48700 → « 48 700 »).
  formatted := reverse(regexp_replace(reverse(sum_total::text), '(\d{3})(?=\d)', '\1 ', 'g'));

  NEW.items := rebuilt;
  NEW.total := formatted;
  NEW.status := 'pending';
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_orders_reprice_from_menu ON public.orders;
CREATE TRIGGER trg_orders_reprice_from_menu
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.orders_reprice_from_menu();

REVOKE ALL ON FUNCTION public.orders_reprice_from_menu() FROM PUBLIC;
-- Exécuté par le moteur de triggers ; pas d'appel direct client.

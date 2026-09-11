-- Greatlife — Migration 012 : Table des commandes en ligne
-- ========================================================
-- Permet aux clients de passer une ou plusieurs commandes en ligne,
-- à l'image des sites de restaurants célèbres. L'admin gère les
-- statuts (confirmé / en attente / annulé) et le client est notifié
-- par email à chaque changement de statut.

CREATE TABLE IF NOT EXISTS public.orders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref          TEXT NOT NULL DEFAULT '',
  nom          TEXT NOT NULL,
  email        TEXT NOT NULL,
  phone        TEXT NOT NULL DEFAULT '',
  items        JSONB NOT NULL DEFAULT '[]'::jsonb,
  total        TEXT NOT NULL DEFAULT '0',
  pickup_time  TEXT NOT NULL DEFAULT '',
  notes        TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_ref ON public.orders(ref);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Les clients (anonymes) peuvent passer une commande
CREATE POLICY "orders_public_insert" ON public.orders
  FOR INSERT TO anon WITH CHECK (true);

-- Les admins authentifiés (owner/manager) lisent et mettent à jour les commandes
CREATE POLICY "orders_admin_read" ON public.orders
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.email = auth.jwt() ->> 'email'
        AND au.role IN ('owner', 'manager')
    )
  );

CREATE POLICY "orders_admin_update" ON public.orders
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.email = auth.jwt() ->> 'email'
        AND au.role IN ('owner', 'manager')
    )
  );

-- Active le Realtime pour la table orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

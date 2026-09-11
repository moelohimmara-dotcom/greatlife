-- Greatlife — Migration 006 : Table des réservations
-- ================================================

CREATE TABLE IF NOT EXISTS public.reservations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom          TEXT NOT NULL,
  email        TEXT NOT NULL,
  phone        TEXT NOT NULL DEFAULT '',
  date         TEXT NOT NULL,
  time         TEXT NOT NULL,
  guests       INTEGER NOT NULL DEFAULT 2,
  message      TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reservations_date ON public.reservations(date);

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reservations_public_insert" ON public.reservations
  FOR INSERT TO anon WITH (true);

CREATE POLICY "reservations_admin_read" ON public.reservations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.email = auth.jwt() ->> 'email'
        AND au.role IN ('owner', 'manager')
    )
  );

CREATE POLICY "reservations_admin_update" ON public.reservations
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.email = auth.jwt() ->> 'email'
        AND au.role IN ('owner', 'manager')
    )
  );

-- Greatlife — Migration 017 : Journal d'activité (audit trail)
-- ============================================================================
-- Trace les actions sensibles du panneau admin (mises à jour de statut,
-- suppressions, modifications de configuration, gestion des utilisateurs).
-- Lecture réservée à owner/manager. Écriture depuis les fonctions admin
-- (via l'API Supabase authentifiée) — on autorise l'insertion par les
-- rôles admin afin que le panneau puisse enregistrer les actions.

CREATE TABLE IF NOT EXISTS public.audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ DEFAULT now(),
  actor       TEXT NOT NULL DEFAULT '',
  action      TEXT NOT NULL,
  target      TEXT NOT NULL DEFAULT '',
  detail      TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_admin_read" ON public.audit_log;
CREATE POLICY "audit_admin_read" ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.is_admin(ARRAY['owner', 'manager']));

DROP POLICY IF EXISTS "audit_admin_insert" ON public.audit_log;
CREATE POLICY "audit_admin_insert" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(ARRAY['owner', 'manager']));

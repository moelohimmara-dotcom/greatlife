-- Statut actif/suspendu + suivi des invitations pour les utilisateurs admin
ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;

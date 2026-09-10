-- Greatlife — Migration 002 : Row Level Security
-- ===============================================

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Lecture publique du menu
CREATE POLICY "menu_public_read" ON public.menu_items
  FOR SELECT TO anon, authenticated USING (true);

-- Écriture du menu réservée aux admins (owner, manager, chef)
CREATE POLICY "menu_admin_write" ON public.menu_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.email = auth.jwt() ->> 'email'
        AND au.role IN ('owner', 'manager', 'chef')
    )
  );

-- Lecture publique des contenus de site
CREATE POLICY "content_public_read" ON public.site_content
  FOR SELECT TO anon, authenticated USING (true);

-- Écriture des contenus réservée aux admins (owner, manager)
CREATE POLICY "content_admin_write" ON public.site_content
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.email = auth.jwt() ->> 'email'
        AND au.role IN ('owner', 'manager')
    )
  );

-- Lecture des messages réservée aux admins (owner, manager)
CREATE POLICY "messages_admin_read" ON public.messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.email = auth.jwt() ->> 'email'
        AND au.role IN ('owner', 'manager')
    )
  );

-- Insertion publique des messages (le formulaire de contact est public)
CREATE POLICY "messages_public_insert" ON public.messages
  FOR INSERT TO anon WITH (true);

-- Gestion des admin_users réservée au propriétaire
CREATE POLICY "admin_users_owner_manage" ON public.admin_users
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.email = auth.jwt() ->> 'email'
        AND au.role = 'owner'
    )
  );

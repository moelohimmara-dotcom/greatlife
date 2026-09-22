export const ADMIN_MODULES = [
  'dashboard',
  'orders',
  'reservations',
  'messages',
  'content',
  'menu',
  'blog',
  'media',
  'team',
  'theme',
  'visibility',
  'settings',
  'forms',
  'users',
  'audit',
] as const

export type AdminModuleKey = (typeof ADMIN_MODULES)[number]

export const MODULE_PATH: Record<AdminModuleKey, string> = {
  dashboard: '/admin',
  orders: '/admin/commandes',
  reservations: '/admin/reservations',
  messages: '/admin/messages',
  content: '/admin/atelier',
  menu: '/admin/carte',
  blog: '/admin/blog',
  media: '/admin/mediatheque',
  team: '/admin/equipe',
  theme: '/admin/apparence',
  visibility: '/admin/visibilite',
  settings: '/admin/reglages',
  forms: '/admin/formulaires',
  users: '/admin/utilisateurs',
  audit: '/admin/journal',
}

export const SLUG_TO_MODULE: Record<string, AdminModuleKey> = {
  '': 'dashboard',
  commandes: 'orders',
  reservations: 'reservations',
  messages: 'messages',
  atelier: 'content',
  carte: 'menu',
  blog: 'blog',
  mediatheque: 'media',
  equipe: 'team',
  apparence: 'theme',
  visibilite: 'visibility',
  reglages: 'settings',
  formulaires: 'forms',
  utilisateurs: 'users',
  journal: 'audit',
}

export function pathForModule(module: string): string {
  if (module in MODULE_PATH) return MODULE_PATH[module as AdminModuleKey]
  return '/admin'
}

export function moduleFromPathname(pathname: string): AdminModuleKey {
  const raw = pathname.replace(/^\/admin\/?/, '').split('/')[0] ?? ''
  return SLUG_TO_MODULE[raw] ?? 'dashboard'
}

export const NAV_GROUPS: [string, [AdminModuleKey, string, string][]][] = [
  ['Opérations', [
    ['dashboard', 'Vue d’ensemble', 'grid'],
    ['orders', 'Commandes', 'coin'],
    ['reservations', 'Réservations', 'calendar'],
    ['messages', 'Messages', 'mail'],
  ]],
  ['Contenu', [
    ['content', 'Éditeur du site', 'write'],
    ['menu', 'Carte & prix', 'leaf'],
    ['blog', 'Blog', 'write'],
    ['media', 'Médiathèque', 'image'],
    ['team', 'Équipe & engagements', 'users'],
  ]],
  ['Configuration', [
    ['theme', 'Apparence', 'palette'],
    ['visibility', 'Visibilité', 'eye'],
    ['settings', 'Réglages du restaurant', 'settings'],
    ['forms', 'Formulaires & notifications', 'settings'],
    ['users', 'Utilisateurs & rôles', 'users'],
    ['audit', "Journal d'activité", 'eye'],
  ]],
]

export const MOBILE_TAB_KEYS: AdminModuleKey[] = [
  'dashboard',
  'orders',
  'reservations',
  'messages',
  'menu',
]

export const MOBILE_TAB_LABELS: Partial<Record<AdminModuleKey, string>> = {
  dashboard: 'File',
  orders: 'Commandes',
  reservations: 'Résas',
  messages: 'Messages',
  menu: 'Carte',
}

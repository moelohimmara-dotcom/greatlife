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
  'consolePrefs',
  'forms',
  'users',
  'account',
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
  consolePrefs: '/admin/preferences',
  forms: '/admin/formulaires',
  users: '/admin/utilisateurs',
  account: '/admin/mon-compte',
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
  preferences: 'consolePrefs',
  formulaires: 'forms',
  utilisateurs: 'users',
  'mon-compte': 'account',
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
  ['Pilotage', [
    ['dashboard', 'Tableau de bord', 'grid'],
    ['orders', 'Commandes', 'coin'],
    ['reservations', 'Réservations', 'calendar'],
    ['messages', 'Messages', 'mail'],
  ]],
  ['Contenu', [
    ['content', 'Modifier le site', 'write'],
    ['menu', 'Carte & prix', 'leaf'],
    ['blog', 'Blog', 'write'],
    ['media', 'Médias', 'image'],
    ['team', 'Équipe & contenus', 'users'],
  ]],
  ['Apparence', [
    ['theme', 'Thème & ambiance', 'palette'],
    ['visibility', 'Visibilité', 'eye'],
  ]],
  ['Système', [
    ['consolePrefs', 'Préférences de la console', 'layout'],
    ['settings', 'Réglages du restaurant', 'settings'],
    ['forms', 'Formulaires & notifications', 'settings'],
    ['users', 'Utilisateurs & rôles', 'users'],
    ['account', 'Mon compte', 'settings'],
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
  dashboard: 'Accueil',
  orders: 'Commandes',
  reservations: 'Résas',
  messages: 'Messages',
  menu: 'Carte',
}

export const MOBILE_MORE_KEYS: AdminModuleKey[] = [
  'content',
  'media',
  'blog',
  'consolePrefs',
  'settings',
  'team',
  'theme',
  'visibility',
  'forms',
  'users',
  'account',
  'audit',
]

export const MOBILE_MORE_LABELS: Partial<Record<AdminModuleKey, string>> = {
  content: 'Atelier',
  media: 'Médias',
  blog: 'Blog',
  consolePrefs: 'Préférences',
  settings: 'Restaurant',
  team: 'Équipe',
  theme: 'Apparence',
  visibility: 'Visibilité',
  forms: 'Formulaires',
  users: 'Utilisateurs',
  account: 'Mon compte',
  audit: 'Journal',
}

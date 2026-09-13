export const MODULES = ['Contenu', 'Carte/Prix', 'Design', 'Médias', 'Blog', 'Formulaires', 'Utilisateurs'] as const

export type Permission = 'écrire' | 'lecture' | 'carte' | 'blog' | '—'

export interface Role {
  id: string
  name: string
  perms: {
    Contenu: Permission
    'Carte/Prix': Permission
    Design: Permission
    Médias: Permission
    Blog: Permission
    Formulaires: Permission
    Utilisateurs: Permission
  }
}

export const ROLES: Role[] = [
  { id: 'owner', name: 'Propriétaire', perms: { Contenu: 'écrire', 'Carte/Prix': 'écrire', Design: 'écrire', Médias: 'écrire', Blog: 'écrire', Formulaires: 'écrire', Utilisateurs: 'écrire' } },
  { id: 'manager', name: 'Gérant', perms: { Contenu: 'écrire', 'Carte/Prix': 'écrire', Design: '—', Médias: 'écrire', Blog: 'écrire', Formulaires: 'écrire', Utilisateurs: 'lecture' } },
  { id: 'chef', name: 'Chef / Resp. carte', perms: { Contenu: 'lecture', 'Carte/Prix': 'écrire', Design: '—', Médias: 'carte', Blog: '—', Formulaires: '—', Utilisateurs: '—' } },
  { id: 'editor', name: 'Rédacteur blog', perms: { Contenu: 'blog', 'Carte/Prix': '—', Design: '—', Médias: 'blog', Blog: 'écrire', Formulaires: '—', Utilisateurs: '—' } },
  { id: 'marketing', name: 'Marketing', perms: { Contenu: '—', 'Carte/Prix': '—', Design: '—', Médias: 'écrire', Blog: 'écrire', Formulaires: 'lecture', Utilisateurs: '—' } },
  { id: 'guest', name: 'Invité / Lecteur', perms: { Contenu: 'lecture', 'Carte/Prix': 'lecture', Design: '—', Médias: '—', Blog: 'lecture', Formulaires: '—', Utilisateurs: '—' } },
]

export const ROLE_LABELS: Record<string, string> = ROLES.reduce((acc, r) => {
  acc[r.id] = r.name
  return acc
}, {} as Record<string, string>)

export const ADMIN_PANEL_ROLES = ['owner', 'manager', 'chef', 'editor', 'marketing', 'guest']

export interface ModuleAccess {
  module: string
  roles: string[]
  writeRoles: string[]
}

export const MODULE_ACCESS: Record<string, ModuleAccess> = {
  dashboard: { module: 'Tableau de bord', roles: ['owner', 'manager', 'chef', 'editor', 'marketing', 'guest'], writeRoles: [] },
  orders: { module: 'Commandes', roles: ['owner', 'manager'], writeRoles: ['owner', 'manager'] },
  messages: { module: 'Messages', roles: ['owner', 'manager'], writeRoles: ['owner', 'manager'] },
  reservations: { module: 'Réservations', roles: ['owner', 'manager'], writeRoles: ['owner', 'manager'] },
  content: { module: 'Contenu', roles: ['owner', 'manager', 'chef', 'editor', 'guest'], writeRoles: ['owner', 'manager'] },
  team: { module: 'Équipe & contenus', roles: ['owner', 'manager'], writeRoles: ['owner', 'manager'] },
  menu: { module: 'Carte & prix', roles: ['owner', 'manager', 'chef', 'guest'], writeRoles: ['owner', 'manager', 'chef'] },
  blog: { module: 'Blog', roles: ['owner', 'manager', 'editor', 'marketing', 'guest'], writeRoles: ['owner', 'manager', 'editor'] },
  theme: { module: 'Thème & ambiance', roles: ['owner'], writeRoles: ['owner'] },
  media: { module: 'Médias', roles: ['owner', 'manager', 'editor', 'marketing'], writeRoles: ['owner', 'manager', 'editor', 'marketing'] },
  visibility: { module: 'Visibilité', roles: ['owner', 'manager'], writeRoles: ['owner', 'manager'] },
  users: { module: 'Utilisateurs & rôles', roles: ['owner'], writeRoles: ['owner'] },
  forms: { module: 'Formulaires & emails', roles: ['owner', 'manager', 'marketing'], writeRoles: ['owner', 'manager'] },
  settings: { module: 'Réglages globaux', roles: ['owner', 'manager'], writeRoles: ['owner', 'manager'] },
  audit: { module: "Journal d'activité", roles: ['owner', 'manager'], writeRoles: [] },
}

export function canAccessModule(moduleKey: string, role: string): boolean {
  const access = MODULE_ACCESS[moduleKey]
  if (!access) return false
  return access.roles.includes(role)
}

export function canWriteModule(moduleKey: string, role: string): boolean {
  const access = MODULE_ACCESS[moduleKey]
  if (!access || access.writeRoles.length === 0) return true
  return access.writeRoles.includes(role)
}

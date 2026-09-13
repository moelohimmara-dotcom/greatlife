export type CrudAction = 'create' | 'update' | 'delete' | 'publish'

export interface RoleDef {
  id: string
  name: string
}

export const ROLES: RoleDef[] = [
  { id: 'owner', name: 'Propri\u00e9taire' },
  { id: 'manager', name: 'G\u00e9rant' },
  { id: 'chef', name: 'Chef / Resp. carte' },
  { id: 'editor', name: 'R\u00e9dacteur blog' },
  { id: 'marketing', name: 'Marketing' },
  { id: 'guest', name: 'Invit\u00e9 / Lecteur' },
]

export const ROLE_LABELS: Record<string, string> = ROLES.reduce((acc, r) => {
  acc[r.id] = r.name
  return acc
}, {} as Record<string, string>)

export const ADMIN_PANEL_ROLES = ROLES.map(r => r.id)

export interface ModuleAccess {
  module: string
  roles: string[]
  actions: Partial<Record<CrudAction, string[]>>
}

function writeRolesFromActions(actions: Partial<Record<CrudAction, string[]>>): string[] {
  const set = new Set<string>()
  for (const roles of Object.values(actions)) if (roles) roles.forEach(r => set.add(r))
  return Array.from(set)
}

export const MODULE_ACCESS: Record<string, ModuleAccess> = {
  dashboard: { module: 'Tableau de bord', roles: ROLES.map(r => r.id), actions: {} },
  orders: { module: 'Commandes', roles: ['owner', 'manager'], actions: { update: ['owner', 'manager'], delete: ['owner', 'manager'] } },
  messages: { module: 'Messages', roles: ['owner', 'manager'], actions: { update: ['owner', 'manager'], delete: ['owner', 'manager'] } },
  reservations: { module: 'R\u00e9servations', roles: ['owner', 'manager'], actions: { update: ['owner', 'manager'], delete: ['owner', 'manager'] } },
  content: { module: 'Contenu', roles: ['owner', 'manager', 'chef', 'editor', 'guest'], actions: { create: ['owner', 'manager'], update: ['owner', 'manager'] } },
  team: { module: '\u00c9quipe & contenus', roles: ['owner', 'manager'], actions: { create: ['owner', 'manager'], update: ['owner', 'manager'] } },
  menu: { module: 'Carte & prix', roles: ['owner', 'manager', 'chef', 'guest'], actions: { create: ['owner', 'manager', 'chef'], update: ['owner', 'manager', 'chef'], delete: ['owner', 'manager', 'chef'] } },
  blog: { module: 'Blog', roles: ['owner', 'manager', 'editor', 'marketing', 'guest'], actions: { create: ['owner', 'manager', 'editor'], update: ['owner', 'manager', 'editor'], delete: ['owner', 'manager'], publish: ['owner', 'manager'] } },
  theme: { module: 'Th\u00e8me & ambiance', roles: ['owner'], actions: { update: ['owner'] } },
  media: { module: 'M\u00e9dias', roles: ['owner', 'manager', 'editor', 'marketing'], actions: { create: ['owner', 'manager', 'editor', 'marketing'], update: ['owner', 'manager', 'editor', 'marketing'], delete: ['owner', 'manager', 'editor', 'marketing'] } },
  visibility: { module: 'Visibilit\u00e9', roles: ['owner', 'manager'], actions: { update: ['owner', 'manager'] } },
  users: { module: 'Utilisateurs & r\u00f4les', roles: ['owner'], actions: { create: ['owner'], update: ['owner'], delete: ['owner'] } },
  forms: { module: 'Formulaires & emails', roles: ['owner', 'manager', 'marketing'], actions: { update: ['owner', 'manager'] } },
  settings: { module: 'R\u00e9glages globaux', roles: ['owner', 'manager'], actions: { update: ['owner', 'manager'] } },
  audit: { module: "Journal d'activit\u00e9", roles: ['owner', 'manager'], actions: {} },
}

export function canAccessModule(moduleKey: string, role: string): boolean {
  const access = MODULE_ACCESS[moduleKey]
  if (!access) return false
  return access.roles.includes(role)
}

export function canWriteModule(moduleKey: string, role: string): boolean {
  const access = MODULE_ACCESS[moduleKey]
  if (!access) return false
  return writeRolesFromActions(access.actions).includes(role)
}

export function canDo(moduleKey: string, action: CrudAction, role: string): boolean {
  const access = MODULE_ACCESS[moduleKey]
  if (!access) return false
  const roles = access.actions[action]
  return roles ? roles.includes(role) : false
}

export const ALL_MODULES = Object.keys(MODULE_ACCESS)

export function permLevelFor(moduleKey: string, role: string): 'write' | 'read' | 'none' {
  const access = MODULE_ACCESS[moduleKey]
  if (!access || !access.roles.includes(role)) return 'none'
  return canWriteModule(moduleKey, role) ? 'write' : 'read'
}

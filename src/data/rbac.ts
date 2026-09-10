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

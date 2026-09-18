export interface UserRecord {
  name: string
  email: string
  role: string
}

export const USERS: UserRecord[] = [
  { name: 'Mister Marcket', email: 'owner@greatlife.gn', role: 'owner' },
  { name: 'Aïcha Diallo', email: 'gerant@greatlife.gn', role: 'manager' },
  { name: 'Mamadou Sow', email: 'chef@greatlife.gn', role: 'chef' },
  { name: 'Fatou Bérété', email: 'redac@greatlife.gn', role: 'editor' },
]

// Comptes du mode démo LOCAL uniquement.
// Ces identifiants ne sont utilisés QUE lorsque Supabase n'est pas configuré
// (`getSupabase()` renvoie null) : ils ne servent plus de repli lorsque Supabase
// est configuré. Ils ne sont donc pas des identifiants de production — les comptes
// de production correspondants ont été neutralisés (cf. docs/01_EXISTING_PROJECT_AUDIT.md).
export const ADMIN_ACCOUNTS = [
  { email: 'owner@greatlife.com', password: 'greatlife2026', name: 'Mister Marcket', role: 'owner' },
  { email: 'gerant@greatlife.com', password: 'greatlife2026', name: 'Aïcha Diallo', role: 'manager' },
]

export const ADMIN_ROLES = ['owner', 'manager', 'chef', 'editor', 'marketing', 'guest']

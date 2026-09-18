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

// Comptes du mode démo LOCAL uniquement : utilisés exclusivement lorsque Supabase
// n'est PAS configuré (`getSupabase()` renvoie null).
//
// `import.meta.env.DEV` vaut `false` dans un build de production : Vite remplace la
// condition, le littéral devient mort et est éliminé. AUCUN mot de passe n'est donc
// embarqué dans le bundle livré au public.
//
// Les comptes de production de même nom ont été neutralisés (rotation du mot de passe
// + désactivation) : voir docs/01_EXISTING_PROJECT_AUDIT.md, risques R1 et R4.
export const ADMIN_ACCOUNTS: { email: string; password: string; name: string; role: string }[] =
  import.meta.env.DEV
    ? [
        { email: 'owner@greatlife.com', password: 'greatlife2026', name: 'Mister Marcket', role: 'owner' },
        { email: 'gerant@greatlife.com', password: 'greatlife2026', name: 'Aïcha Diallo', role: 'manager' },
      ]
    : []

export const ADMIN_ROLES = ['owner', 'manager', 'chef', 'editor', 'marketing', 'guest']

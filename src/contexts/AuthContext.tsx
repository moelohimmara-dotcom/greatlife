import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { ADMIN_ACCOUNTS, ADMIN_ROLES } from '@/data/users'
import { ROLE_LABELS } from '@/data/rbac'
import { getSupabase } from '@/lib/supabase'

interface AuthUser {
  email: string
  name: string
  role: string
}
interface LoginResult {
  ok: boolean
  error?: string
}
interface RoleNotice {
  id: number
  msg: string
}
interface AuthContextValue {
  user: AuthUser | null
  login: (email: string, password: string) => Promise<LoginResult>
  logout: () => void
  loading: boolean
  refreshRole: () => Promise<void>
  roleNotice: RoleNotice | null
  dismissRoleNotice: () => void
}
const AuthContext = createContext<AuthContextValue | null>(null)
export const useAuth = () => useContext(AuthContext)!

const LOCAL_SESSION_KEY = 'greatlife-session'

/** Messages d’erreur de connexion en français métier (jamais le jargon Supabase). */
function messageAuthFr(raw?: string | null): string {
  const m = (raw ?? '').toLowerCase()
  if (!m) return 'Email ou mot de passe incorrect.'
  if (m.includes('invalid login') || m.includes('invalid credentials') || m.includes('invalid_credentials')) {
    return 'Email ou mot de passe incorrect.'
  }
  if (m.includes('email not confirmed') || m.includes('not confirmed')) {
    return 'Confirmez votre email avant de vous connecter.'
  }
  if (m.includes('too many') || m.includes('rate limit')) {
    return 'Trop de tentatives. Réessayez dans quelques minutes.'
  }
  if (m.includes('network') || m.includes('fetch')) {
    return 'Connexion impossible pour le moment. Réessayez.'
  }
  return 'Email ou mot de passe incorrect.'
}

function readLocalSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY)
    if (!raw) return null
    const u = JSON.parse(raw) as AuthUser
    if (u && u.email && u.role) return u
    return null
  } catch {
    return null
  }
}

function writeLocalSession(u: AuthUser | null) {
  try {
    if (u) localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(u))
    else localStorage.removeItem(LOCAL_SESSION_KEY)
  } catch {
    /* ignore */
  }
}

/** Résultat d'une vérification de rôle en base.
 *  `ok: false` signifie que la vérification n'a PAS pu aboutir (panne réseau, erreur) :
 *  c'est volontairement distinct d'une absence de ligne, pour ne pas détruire une
 *  session légitime à cause d'un incident passager. Dans les deux cas, aucun accès
 *  n'est accordé : l'échec est toujours fermé. */
type AdminLookup =
  | { ok: true; role: string | null; active: boolean; name: string | null }
  | { ok: false }

async function resolveUserFromTable(email: string): Promise<AdminLookup> {
  const sb = getSupabase()
  // Sans Supabase configuré, aucune vérification serveur n'est possible.
  if (!sb) return { ok: false }
  try {
    const { data, error } = await sb
      .from('admin_users')
      .select('*')
      .eq('email', email)
      .maybeSingle()
    if (error) return { ok: false }
    // Aucune ligne : le compte n'a aucun rôle en base → accès refusé.
    if (!data) return { ok: true, role: null, active: false, name: null }
    const row = data as Record<string, unknown>
    return {
      ok: true,
      role: (row.role as string) ?? null,
      // Seul un `active === true` explicite autorise l'accès (échec fermé).
      active: row.active === true,
      name: (row.name as string) ?? null,
    }
  } catch {
    return { ok: false }
  }
}

function buildUserFromEmail(email: string, role: string, name?: string | null): AuthUser {
  return {
    email,
    name: name || email.split('@')[0],
    role,
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [roleNotice, setRoleNotice] = useState<RoleNotice | null>(null)
  const userRef = React.useRef<AuthUser | null>(null)
  userRef.current = user
  const noticeIdRef = React.useRef(0)

  useEffect(() => {
    let active = true
    async function restore() {
      const sb = getSupabase()
      if (sb) {
        try {
          const { data } = await sb.auth.getSession()
          const session = data.session
          if (session && active) {
            const email = (session.user.email ?? '').toLowerCase()
            const info = await resolveUserFromTable(email)
            if (!info.ok) {
              // Vérification impossible (panne passagère) : aucun accès n'est accordé,
              // mais la session Supabase n'est PAS détruite pour autant.
              if (active) {
                writeLocalSession(null)
                setUser(null)
              }
            } else if (!info.role || !ADMIN_ROLES.includes(info.role) || !info.active) {
              // Aucun rôle exploitable, ou compte suspendu : accès refusé et session close.
              try { await sb.auth.signOut() } catch { /* ignore */ }
              writeLocalSession(null)
              if (active) setUser(null)
            } else {
              const u = buildUserFromEmail(email, info.role, info.name)
              setUser(u)
              writeLocalSession(u)
            }
          } else if (active) {
            // Supabase est configuré mais il n'existe aucune session valide :
            // l'accès administrateur est refusé.
            writeLocalSession(null)
            setUser(null)
          }
        } catch {
          // Échec de lecture de session : on échoue en mode fermé.
          if (active) {
            writeLocalSession(null)
            setUser(null)
          }
        }
      } else if (active) {
        const local = readLocalSession()
        if (local && ADMIN_ROLES.includes(local.role)) setUser(local)
      }
      if (active) setLoading(false)
    }
    restore()
    return () => {
      active = false
    }
  }, [])

  const refreshRole = async () => {
    const current = userRef.current
    if (!current) return
    const sb = getSupabase()
    // En mode démo local, il n'y a aucune session Supabase à vérifier.
    if (!sb) return
    // Sans session active, la requête serait évaluée en `anon` et renverrait 0 ligne :
    // la confondre avec une suspension déconnecterait un utilisateur légitime.
    try {
      const { data } = await sb.auth.getSession()
      if (!data.session) return
    } catch {
      return
    }
    let info = await resolveUserFromTable(current.email)
    if (!info.ok) return // panne passagère : on ne modifie rien
    if (!info.role || !ADMIN_ROLES.includes(info.role) || !info.active) {
      // Une seconde vérification avant de conclure : une suspension ne doit pas être
      // déduite d'un aléa réseau, mais elle doit couper la session sans délai.
      await new Promise((r) => setTimeout(r, 1500))
      info = await resolveUserFromTable(current.email)
      if (!info.ok) return
      if (info.role && ADMIN_ROLES.includes(info.role) && info.active) return
      try { await sb.auth.signOut() } catch { /* ignore */ }
      writeLocalSession(null)
      setUser(null)
      return
    }
    if (info.role !== current.role) {
      const u = buildUserFromEmail(current.email, info.role, info.name)
      setUser(u)
      writeLocalSession(u)
      noticeIdRef.current += 1
      setRoleNotice({
        id: noticeIdRef.current,
        msg: `Vos rôles/permissions ont été mis à jour. Nouveau rôle : ${ROLE_LABELS[info.role] ?? info.role}.`,
      })
    }
  }
  const dismissRoleNotice = useCallback(() => setRoleNotice(null), [])

  useEffect(() => {
    if (!user) return
    const timer = setInterval(() => { refreshRole() }, 60000)
    return () => clearInterval(timer)
  }, [user])

  useEffect(() => {
    const sb = getSupabase()
    if (!sb) return
    const { data: sub } = sb.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session && !userRef.current) {
        const email = (session.user.email ?? '').toLowerCase()
        const info = await resolveUserFromTable(email)
        // Le rôle vient EXCLUSIVEMENT de la base : aucun repli codé en dur.
        if (info.ok && info.role && ADMIN_ROLES.includes(info.role) && info.active) {
          const u = buildUserFromEmail(email, info.role, info.name)
          setUser(u)
          writeLocalSession(u)
        }
      }
    })
    return () => { sub.subscription.unsubscribe() }
  }, [])

  const login = async (email: string, password: string): Promise<LoginResult> => {
    const normalized = email.trim().toLowerCase()

    // Accès temporaires de démonstration : disponibles uniquement en développement.
    // Ils restent indépendants de Supabase pour permettre de découvrir la console
    // avant d'avoir créé les comptes administrateurs dans le projet connecté.
    if (import.meta.env.DEV) {
      const demoAccount = ADMIN_ACCOUNTS.find(
        (account) => account.email === normalized && account.password === password,
      )
      if (demoAccount) {
        const u = buildUserFromEmail(demoAccount.email, demoAccount.role, demoAccount.name)
        setUser(u)
        writeLocalSession(u)
        return { ok: true }
      }
    }

    const sb = getSupabase()
    if (!sb) {
      const account = ADMIN_ACCOUNTS.find(
        a => a.email === normalized && a.password === password
      )
      if (account && ADMIN_ROLES.includes(account.role)) {
        const u = buildUserFromEmail(account.email, account.role)
        setUser(u)
        writeLocalSession(u)
        return { ok: true }
      }
      return { ok: false, error: 'Email ou mot de passe incorrect.' }
    }
    try {
      const { data, error } = await sb.auth.signInWithPassword({
        email: normalized,
        password,
      })
      if (error || !data.user) {
        // Aucun repli sur des identifiants codés en dur : lorsque Supabase est
        // configuré, seule une authentification réelle ouvre l'accès administrateur.
        return { ok: false, error: messageAuthFr(error?.message) }
      }
      const info = await resolveUserFromTable(normalized)
      if (!info.ok) {
        await sb.auth.signOut()
        return { ok: false, error: 'Vérification du compte impossible. Réessayez.' }
      }
      // Le rôle vient EXCLUSIVEMENT de la table admin_users : aucun repli codé en dur.
      if (!info.role || !ADMIN_ROLES.includes(info.role)) {
        await sb.auth.signOut()
        return { ok: false, error: 'Accès non autorisé pour ce compte.' }
      }
      if (!info.active) {
        await sb.auth.signOut()
        return { ok: false, error: 'Ce compte est suspendu. Contactez le propriétaire.' }
      }
      const u = buildUserFromEmail(normalized, info.role, info.name)
      setUser(u)
      writeLocalSession(u)
      return { ok: true }
    } catch {
      return {
        ok: false,
        error: 'Connexion impossible pour le moment. Réessayez.',
      }
    }
  }

  const logout = () => {
    const sb = getSupabase()
    if (sb) sb.auth.signOut()
    setUser(null)
    writeLocalSession(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, refreshRole, roleNotice, dismissRoleNotice }}>
      {children}
    </AuthContext.Provider>
  )
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (!ADMIN_ROLES.includes(user.role)) return <Navigate to="/" replace />
  return <>{children}</>
}

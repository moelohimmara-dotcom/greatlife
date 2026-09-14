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

async function resolveUserFromTable(email: string): Promise<{ role: string | null; active: boolean }> {
  const sb = getSupabase()
  if (!sb) return { role: null, active: true }
  try {
    const { data, error } = await sb
      .from('admin_users')
      .select('role, active')
      .eq('email', email)
      .maybeSingle()
    if (error || !data) return { role: null, active: true }
    const row = data as { role?: string; active?: boolean }
    return { role: row.role ?? null, active: row.active === undefined ? true : Boolean(row.active) }
  } catch {
    return { role: null, active: true }
  }
}

function buildUserFromEmail(email: string, role: string): AuthUser {
  const local = ADMIN_ACCOUNTS.find(a => a.email === email)
  return {
    email,
    name: local?.name ?? email.split('@')[0],
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
            let role = info.role
            if (!role || !ADMIN_ROLES.includes(role)) {
              role = ADMIN_ACCOUNTS.find(a => a.email === email)?.role ?? null
            }
            if (role && ADMIN_ROLES.includes(role) && info.active) {
              const u = buildUserFromEmail(email, role)
              setUser(u)
              writeLocalSession(u)
            } else {
              const local = readLocalSession()
              if (local && ADMIN_ROLES.includes(local.role)) setUser(local)
            }
          } else if (active) {
            const local = readLocalSession()
            if (local && ADMIN_ROLES.includes(local.role)) setUser(local)
          }
        } catch {
          const local = readLocalSession()
          if (local && active && ADMIN_ROLES.includes(local.role)) setUser(local)
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
    const freshInfo = await resolveUserFromTable(current.email)
    const fresh = freshInfo.role
    if (!fresh || !ADMIN_ROLES.includes(fresh) || !freshInfo.active) return
    if (fresh !== current.role) {
      const u = buildUserFromEmail(current.email, fresh)
      setUser(u)
      writeLocalSession(u)
      noticeIdRef.current += 1
      setRoleNotice({
        id: noticeIdRef.current,
        msg: `Vos rôles/permissions ont été mis à jour. Nouveau rôle : ${ROLE_LABELS[fresh] ?? fresh}.`,
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
        let role = info.role
        if (!role || !ADMIN_ROLES.includes(role)) {
          role = ADMIN_ACCOUNTS.find(a => a.email === email)?.role ?? null
        }
        if (role && ADMIN_ROLES.includes(role) && info.active) {
          const u = buildUserFromEmail(email, role)
          setUser(u)
          writeLocalSession(u)
        }
      }
    })
    return () => { sub.subscription.unsubscribe() }
  }, [])

  const login = async (email: string, password: string): Promise<LoginResult> => {
    const normalized = email.trim().toLowerCase()
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
      return { ok: false, error: 'Identifiants incorrects ou accès non autorisé.' }
    }
    try {
      const { data, error } = await sb.auth.signInWithPassword({
        email: normalized,
        password,
      })
      if (error || !data.user) {
        const account = ADMIN_ACCOUNTS.find(
          a => a.email === normalized && a.password === password
        )
        if (account && ADMIN_ROLES.includes(account.role)) {
          const u = buildUserFromEmail(account.email, account.role)
          setUser(u)
          writeLocalSession(u)
          return { ok: true }
        }
        return { ok: false, error: error?.message ?? 'Identifiants incorrects.' }
      }
      const info = await resolveUserFromTable(normalized)
      let role = info.role
      if (!role || !ADMIN_ROLES.includes(role)) {
        role = ADMIN_ACCOUNTS.find(a => a.email === normalized)?.role ?? null
      }
      if (!role || !ADMIN_ROLES.includes(role)) {
        await sb.auth.signOut()
        return { ok: false, error: 'Accès non autorisé pour ce compte.' }
      }
      if (!info.active) {
        await sb.auth.signOut()
        return { ok: false, error: 'Ce compte est suspendu. Contactez le propriétaire.' }
      }
      const u = buildUserFromEmail(normalized, role)
      setUser(u)
      writeLocalSession(u)
      return { ok: true }
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Erreur de connexion.',
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

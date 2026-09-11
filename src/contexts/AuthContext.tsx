import React, { createContext, useContext, useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { ADMIN_ACCOUNTS, ADMIN_ROLES } from '@/data/users'
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
interface AuthContextValue {
  user: AuthUser | null
  login: (email: string, password: string) => Promise<LoginResult>
  logout: () => void
  loading: boolean
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

async function resolveRoleFromTable(email: string): Promise<string | null> {
  const sb = getSupabase()
  if (!sb) return null
  try {
    const { data, error } = await sb
      .from('admin_users')
      .select('role')
      .eq('email', email)
      .maybeSingle()
    if (error || !data) return null
    return (data as { role?: string }).role ?? null
  } catch {
    return null
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
            let role = await resolveRoleFromTable(email)
            if (!role || !ADMIN_ROLES.includes(role)) {
              role = ADMIN_ACCOUNTS.find(a => a.email === email)?.role ?? null
            }
            if (role && ADMIN_ROLES.includes(role)) {
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
      let role = await resolveRoleFromTable(normalized)
      if (!role || !ADMIN_ROLES.includes(role)) {
        role = ADMIN_ACCOUNTS.find(a => a.email === normalized)?.role ?? null
      }
      if (!role || !ADMIN_ROLES.includes(role)) {
        await sb.auth.signOut()
        return { ok: false, error: 'Accès non autorisé pour ce compte.' }
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
    <AuthContext.Provider value={{ user, login, logout, loading }}>
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

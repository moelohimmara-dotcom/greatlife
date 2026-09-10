import React, { createContext, useContext, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ADMIN_ACCOUNTS, ADMIN_ROLES } from '@/data/users'

interface AuthUser {
  email: string
  name: string
  role: string
}

interface AuthContextValue {
  user: AuthUser | null
  login: (email: string, password: string) => { ok: boolean; error?: string }
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export const useAuth = () => useContext(AuthContext)!

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)

  const login = (email: string, password: string) => {
    const account = ADMIN_ACCOUNTS.find(a => a.email === email && a.password === password)
    if (account && ADMIN_ROLES.includes(account.role)) {
      setUser({ email: account.email, name: account.name, role: account.role })
      return { ok: true }
    }
    return { ok: false, error: 'Identifiants incorrects ou accès non autorisé.' }
  }

  const logout = () => setUser(null)

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!ADMIN_ROLES.includes(user.role)) return <Navigate to="/" replace />
  return <>{children}</>
}

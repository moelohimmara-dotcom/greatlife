import React from 'react'
import { useSite } from '@/contexts/SiteContext'
import { useAuth } from '@/contexts/AuthContext'
import { Icon } from '@/lib/icons'
import { ROLE_LABELS } from '@/data/rbac'

export const ADMIN_URL = 'https://greatlife-conakry.netlify.app/admin'

export function dateFr(iso: string | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function heureCourte(iso: string | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export function ageRelatifFr(iso: string | undefined, nowMs = Date.now()): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Math.max(0, nowMs - t)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'à l’instant'
  if (mins === 1) return 'il y a 1 min'
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours === 1) return 'il y a 1 h'
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'il y a 1 j'
  return `il y a ${days} j`
}

export function SaveBar({ status, error }: { status: 'idle' | 'saving' | 'saved' | 'error'; error?: string }) {
  const label = status === 'saving' ? 'Enregistrement…' : status === 'saved' ? 'Enregistré' : status === 'error' ? 'Échec de l\'enregistrement' : ''
  if (!label && status === 'idle') return null
  const tone = status === 'error' ? 'is-error' : status === 'saved' ? 'is-ok' : 'is-busy'
  return (
    <span
      role="status"
      aria-live="polite"
      aria-atomic="true"
      title={error}
      className={`admin-save-live ${tone}`}
    >
      {label}{error ? ` — ${error}` : ''}
    </span>
  )
}

export function SectionTitle({ children, color }: { children: React.ReactNode; color: string }) {
  const { theme: t } = useSite()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '12px', fontWeight: 700, color: t.heading, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
      <span style={{ width: 4, height: 16, borderRadius: 3, background: color }} />
      {children}
    </div>
  )
}

export const AccessBanner = () => {
  const { theme: t } = useSite()
  const { user } = useAuth()
  const role = user?.role ?? 'guest'
  return (
    <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 12, background: `${t.gold || '#b8860b'}14`, border: `1px solid ${t.primary}22`, fontSize: 13, color: t.heading, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ flexShrink: 0 }}>{Icon.eye(16, t.gold || '#b8860b')}</span>
      <span>Accès en lecture seule — votre rôle « {ROLE_LABELS[role] ?? role} » ne permet pas de modifier ce module.</span>
    </div>
  )
}

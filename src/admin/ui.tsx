import React from 'react'
import { useSite } from '@/contexts/SiteContext'
import { Icon } from '@/lib/icons'

export function PageHeader({
  title,
  subtitle,
  badge,
  actions,
}: {
  title: string
  subtitle?: string
  badge?: React.ReactNode
  actions?: React.ReactNode
}) {
  const { theme: t } = useSite()
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h2 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '26px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
            {title}
          </h2>
          {badge}
        </div>
        {subtitle && <p style={{ color: t.muted, fontSize: '14px', marginTop: 4, margin: '4px 0 0' }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  )
}

export function StatusPill({ label, color, bg }: { label: string; color: string; bg?: string }) {
  return (
    <span style={{
      fontSize: '11px', fontWeight: 700, padding: '4px 11px', borderRadius: 100,
      background: bg ?? `${color}18`, color, whiteSpace: 'nowrap', display: 'inline-block',
    }}>{label}</span>
  )
}

export function EmptyState({ icon, title, subtitle }: { icon?: React.ReactNode; title: string; subtitle?: string }) {
  const { theme: t } = useSite()
  return (
    <div style={{ padding: '40px 20px', textAlign: 'center', borderRadius: 16, background: t.surfaceAlt, border: `1px dashed ${t.shadow}` }}>
      {icon && <div style={{ opacity: 0.5, marginBottom: 12 }}>{icon}</div>}
      <div style={{ fontWeight: 600, color: t.heading, fontSize: 15, marginBottom: subtitle ? 4 : 0 }}>{title}</div>
      {subtitle && <div style={{ color: t.muted, fontSize: 13 }}>{subtitle}</div>}
    </div>
  )
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  const { theme: t } = useSite()
  return (
    <label style={{ fontSize: '12px', fontWeight: 600, color: t.muted, marginBottom: 6, display: 'block', letterSpacing: '0.01em' }}>
      {children}
    </label>
  )
}

export function inputStyle(t: ReturnType<typeof useSite>['theme']): React.CSSProperties {
  return {
    background: t.surfaceAlt, border: `1px solid ${t.shadow}`, borderRadius: 10,
    padding: '11px 14px', fontSize: '14px', color: t.text, width: '100%',
    fontFamily: 'inherit', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  }
}

export function GhostButton({ onClick, children, disabled, color, title, style }: {
  onClick?: () => void
  children: React.ReactNode
  disabled?: boolean
  color: string
  title?: string
  style?: React.CSSProperties
}) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} style={{
      fontSize: '12px', fontWeight: 600, padding: '8px 14px', borderRadius: 10, cursor: disabled ? 'not-allowed' : 'pointer',
      border: `1px solid ${color}44`, background: 'transparent', color, opacity: disabled ? 0.5 : 1,
      transition: 'background 0.15s', ...style,
    }} onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = `${color}0d` }}
      onMouseLeave={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
    >{children}</button>
  )
}

export function PrimaryButton({ onClick, children, disabled, style, color }: {
  onClick?: () => void
  children: React.ReactNode
  disabled?: boolean
  color?: string
  style?: React.CSSProperties
}) {
  const { theme: t } = useSite()
  const c = color ?? t.primary
  return (
    <button onClick={onClick} disabled={disabled} style={{
      fontSize: '13px', fontWeight: 600, padding: '10px 20px', borderRadius: 100, cursor: disabled ? 'not-allowed' : 'pointer',
      border: 'none', background: c, color: '#fff', opacity: disabled ? 0.5 : 1,
      transition: 'opacity 0.15s, filter 0.15s',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, ...style,
    }} onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.08)' }}
      onMouseLeave={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.filter = 'none' }}
    >{children}</button>
  )
}

export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const { theme: t } = useSite()
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (total <= pageSize) return null
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)
  const btn = (label: React.ReactNode, disabled: boolean, onClick: () => void) => (
    <button onClick={onClick} disabled={disabled} style={{ fontSize: 12, fontWeight: 600, padding: '6px 10px', borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer', border: `1px solid ${disabled ? t.shadow : t.primary + '44'}`, background: 'transparent', color: disabled ? t.muted : t.primary, opacity: disabled ? 0.5 : 1 }}>{label}</button>
  )
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18, flexWrap: 'wrap', fontSize: 12, color: t.muted }}>
      <span>{start}–{end} sur {total}</span>
      <div style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
        {btn(<span style={{ display: 'inline-flex', alignItems: 'center' }}>{Icon.chevronLeft(13, page === 1 ? t.muted : t.primary)}</span>, page === 1, () => onPage(Math.max(1, page - 1)))}
        <span style={{ fontSize: 12, fontWeight: 600, color: t.heading, padding: '0 6px' }}>{page} / {pages}</span>
        {btn(<span style={{ display: 'inline-flex', alignItems: 'center' }}>{Icon.chevronRight(13, page === pages ? t.muted : t.primary)}</span>, page === pages, () => onPage(Math.min(pages, page + 1)))}
      </div>
    </div>
  )
}

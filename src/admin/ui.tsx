import React from 'react'
import { useSite } from '@/contexts/SiteContext'

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

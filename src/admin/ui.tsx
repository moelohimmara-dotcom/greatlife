import React from 'react'
import { useSite } from '@/contexts/SiteContext'
import { Icon } from '@/lib/icons'
import { Bouton, CIBLE, CLASSE_BOUTON, CLASSE_CARTE, ESPACE, HAUTEUR, HAUTEUR_ETAT, RAYON } from '@/admin/editor/chrome'

/** Forme unique des boutons console (rectangle arrondi, pas une pilule). */
export { CIBLE, CLASSE_BOUTON, CLASSE_CARTE, ESPACE, HAUTEUR, HAUTEUR_ETAT, RAYON }

export function formeBouton(opts?: { carre?: boolean }): React.CSSProperties {
  return {
    boxSizing: 'border-box',
    height: HAUTEUR,
    minHeight: HAUTEUR,
    minWidth: opts?.carre ? HAUTEUR : undefined,
    width: opts?.carre ? HAUTEUR : undefined,
    padding: opts?.carre ? 0 : '0 12px',
    overflow: 'visible',
    position: 'relative',
    outline: 'none',
    ['--admin-cible' as string]: `${CIBLE}px`,
    borderRadius: RAYON,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ESPACE,
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'inherit',
    lineHeight: 1.2,
    cursor: 'pointer',
    touchAction: 'manipulation',
    transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.12s ease',
  } as React.CSSProperties
}

/** Pastille d’état (chip) : plus dense qu’un bouton, pas cliquable. */
export function formePastille(): React.CSSProperties {
  return {
    boxSizing: 'border-box',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: HAUTEUR_ETAT,
    minHeight: HAUTEUR_ETAT,
    padding: '0 8px',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'inherit',
    lineHeight: 1,
    whiteSpace: 'nowrap',
    borderRadius: 100,
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }
}

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
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: ESPACE }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: ESPACE, flexWrap: 'wrap' }}>
          <h2 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '26px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
            {title}
          </h2>
          {badge}
        </div>
        {subtitle && <p style={{ color: t.muted, fontSize: '14px', marginTop: 4, margin: '4px 0 0' }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', alignItems: 'center', gap: ESPACE, flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  )
}

export function StatusPill({
  label,
  color,
  bg,
  title,
}: {
  label: string
  color: string
  bg?: string
  /** Explication longue (survol + aria) — le libellé court reste sur la pastille. */
  title?: string
}) {
  const detail = title?.trim() || label
  return (
    <span
      role="status"
      aria-atomic="true"
      title={detail}
      aria-label={detail === label ? label : `${label}. ${detail}`}
      style={{
        ...formePastille(),
        background: bg ?? `${color}18`,
        color,
      }}
    >{label}</span>
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

export function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  const { theme: t } = useSite()
  return (
    <label htmlFor={htmlFor} style={{ fontSize: '12px', fontWeight: 600, color: t.muted, marginBottom: 6, display: 'block', letterSpacing: '0.01em' }}>
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

export function GhostButton({ onClick, children, disabled, color, title, style, busy, type = 'button', ...rest }: {
  onClick?: () => void
  children: React.ReactNode
  disabled?: boolean
  color: string
  title?: string
  style?: React.CSSProperties
  busy?: boolean
  type?: 'button' | 'submit' | 'reset'
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color' | 'style' | 'onClick' | 'disabled' | 'title' | 'type'>) {
  return (
    <Bouton
      type={type}
      genre="secondaire"
      disabled={disabled}
      busy={busy}
      title={title}
      onClick={onClick}
      style={{
        background: 'transparent',
        color,
        border: `1px solid ${color}44`,
        padding: '0 12px',
        ...style,
      }}
      {...rest}
    >
      {children}
    </Bouton>
  )
}

export function PrimaryButton({ onClick, children, disabled, style, color, title, busy, type = 'button', ...rest }: {
  onClick?: () => void
  children: React.ReactNode
  disabled?: boolean
  color?: string
  style?: React.CSSProperties
  title?: string
  busy?: boolean
  type?: 'button' | 'submit' | 'reset'
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color' | 'style' | 'onClick' | 'disabled' | 'title' | 'type'>) {
  const { theme: t } = useSite()
  const c = color ?? t.primary
  return (
    <Bouton
      type={type}
      genre="primaire"
      disabled={disabled}
      busy={busy}
      title={title}
      onClick={onClick}
      style={{
        background: c,
        border: `1px solid ${c}`,
        color: '#fff',
        padding: '0 12px',
        ...style,
      }}
      {...rest}
    >
      {children}
    </Bouton>
  )
}

export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const { theme: t } = useSite()
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (total <= pageSize) return null
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)
  const btn = (label: React.ReactNode, disabled: boolean, onClick: () => void, ariaLabel: string) => (
    <Bouton carre genre="secondaire" onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
      {label}
    </Bouton>
  )
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: ESPACE, marginTop: 18, flexWrap: 'wrap', fontSize: 12, color: t.muted }}>
      <span>{start}–{end} sur {total}</span>
      <div style={{ display: 'inline-flex', gap: ESPACE, alignItems: 'center' }}>
        {btn(<span style={{ display: 'inline-flex', alignItems: 'center' }}>{Icon.chevronLeft(13, page === 1 ? t.muted : t.primary)}</span>, page === 1, () => onPage(Math.max(1, page - 1)), 'Page précédente')}
        <span style={{ fontSize: 12, fontWeight: 600, color: t.heading, padding: '0 6px' }}>{page} / {pages}</span>
        {btn(<span style={{ display: 'inline-flex', alignItems: 'center' }}>{Icon.chevronRight(13, page === pages ? t.muted : t.primary)}</span>, page === pages, () => onPage(Math.min(pages, page + 1)), 'Page suivante')}
      </div>
    </div>
  )
}

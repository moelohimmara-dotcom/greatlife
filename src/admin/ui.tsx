import React, { useEffect } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { Icon } from '@/lib/icons'
import { ADMIN_FOREST, ADMIN_INK, ADMIN_MUTED, Bouton, CIBLE, CLASSE_BOUTON, CLASSE_CARTE, ESPACE, HAUTEUR, HAUTEUR_ETAT, RAYON } from '@/admin/editor/chrome'

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
  return (
    <div className="admin-wf-header">
      <div>
        <p className="admin-wf-eyebrow">Greatlife / Administration</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: ESPACE, flexWrap: 'wrap' }}>
          <h1 className="admin-page-title" style={{ margin: 0 }}>
            {title}
          </h1>
          {badge}
        </div>
        {subtitle && <p className="admin-page-sub" style={{ margin: '6px 0 0' }}>{subtitle}</p>}
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
      aria-live="polite"
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
  return (
    <div className="admin-empty" style={{ padding: '40px 20px', textAlign: 'center', borderRadius: 16 }}>
      {icon && <div style={{ opacity: 0.5, marginBottom: 12 }}>{icon}</div>}
      <div style={{ fontWeight: 600, color: 'var(--admin-ink)', fontSize: 16, marginBottom: subtitle ? 4 : 0 }}>{title}</div>
      {subtitle && <div style={{ color: 'var(--admin-muted)', fontSize: 13 }}>{subtitle}</div>}
    </div>
  )
}

export function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-muted)', marginBottom: 6, display: 'block', letterSpacing: '0.01em' }}>
      {children}
    </label>
  )
}

export function inputStyle(_t?: ReturnType<typeof useSite>['theme']): React.CSSProperties {
  return {
    background: 'var(--admin-paper-muted)',
    border: '1px solid var(--admin-line)',
    borderRadius: 10,
    padding: '11px 14px',
    fontSize: '14px',
    color: 'var(--admin-ink)',
    width: '100%',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
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
  const c = color ?? ADMIN_FOREST
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
    <div style={{ display: 'flex', alignItems: 'center', gap: ESPACE, marginTop: 18, flexWrap: 'wrap', fontSize: 12, color: ADMIN_MUTED }}>
      <span>{start}–{end} sur {total}</span>
      <div style={{ display: 'inline-flex', gap: ESPACE, alignItems: 'center' }}>
        {btn(<span style={{ display: 'inline-flex', alignItems: 'center' }}>{Icon.chevronLeft(13, page === 1 ? ADMIN_MUTED : ADMIN_FOREST)}</span>, page === 1, () => onPage(Math.max(1, page - 1)), 'Page précédente')}
        <span style={{ fontSize: 12, fontWeight: 600, color: ADMIN_INK, padding: '0 6px' }}>{page} / {pages}</span>
        {btn(<span style={{ display: 'inline-flex', alignItems: 'center' }}>{Icon.chevronRight(13, page === pages ? ADMIN_MUTED : ADMIN_FOREST)}</span>, page === pages, () => onPage(Math.min(pages, page + 1)), 'Page suivante')}
      </div>
    </div>
  )
}

/**
 * Fenêtre chaleureuse « bientôt » — pour une action visible dans la console
 * mais pas encore branchée au site / à la base.
 * Le bouton reste cliquable (grisé) pour expliquer, pas seulement désactivé.
 */
export function BientotDialog({
  open,
  titre,
  message,
  onClose,
}: {
  open: boolean
  titre: string
  message: string
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="admin-bientot-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-bientot-titre"
        className="admin-bientot-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="admin-bientot-eyebrow">Bientôt disponible</p>
        <h2 id="admin-bientot-titre">{titre}</h2>
        <p className="admin-bientot-message">{message}</p>
        <PrimaryButton onClick={onClose}>Compris, merci</PrimaryButton>
      </div>
    </div>
  )
}

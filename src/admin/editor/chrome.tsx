/**
 * Chrome de l'éditeur — un seul motif de bouton.
 * Hauteur 44, rayon 10, padding 16. Un seul bouton plein : l'action principale.
 */
import type { ButtonHTMLAttributes, CSSProperties, FocusEvent, ReactNode } from 'react'
import { useSite } from '@/contexts/SiteContext'
import type { ThemePalette } from '@/config/themes'

export const CIBLE = 44
export const RAYON = 10
export const ESPACE = 8

export type GenreBouton = 'primaire' | 'secondaire' | 'actif' | 'danger' | 'silencieux' | 'nav'

export function anneauFocus(t: ThemePalette) {
  return {
    onFocus: (e: FocusEvent<HTMLElement>) => {
      e.currentTarget.style.boxShadow = `0 0 0 2px ${t.primary}`
    },
    onBlur: (e: FocusEvent<HTMLElement>) => {
      e.currentTarget.style.boxShadow = 'none'
    },
  }
}

export function titreColonne(t: ThemePalette): CSSProperties {
  return {
    fontSize: 13,
    fontWeight: 700,
    color: t.heading,
    marginBottom: ESPACE,
    letterSpacing: 0,
    textTransform: 'none',
  }
}

export function boutonOutil(t: ThemePalette, opts: {
  actif?: boolean
  primaire?: boolean
  danger?: boolean
  disabled?: boolean
}): CSSProperties {
  return styleBouton(t, {
    genre: opts.primaire ? 'primaire' : opts.danger ? 'danger' : opts.actif ? 'actif' : 'secondaire',
    disabled: opts.disabled,
  })
}

export function styleBouton(t: ThemePalette, opts: {
  genre?: GenreBouton
  disabled?: boolean
  etendu?: boolean
  carre?: boolean
}): CSSProperties {
  const genre = opts.genre ?? 'secondaire'
  const carre = Boolean(opts.carre)
  const fonds: Record<GenreBouton, string> = {
    primaire: t.primary,
    secondaire: t.surface,
    actif: `${t.primary}14`,
    danger: t.surface,
    silencieux: 'transparent',
    nav: 'transparent',
  }
  const textes: Record<GenreBouton, string> = {
    primaire: '#fff',
    secondaire: t.text,
    actif: t.primary,
    danger: t.accent,
    silencieux: t.muted,
    nav: t.text,
  }
  const bords: Record<GenreBouton, string> = {
    primaire: t.primary,
    secondaire: t.shadow,
    actif: t.primary,
    danger: `${t.accent}66`,
    silencieux: 'transparent',
    nav: 'transparent',
  }
  return {
    boxSizing: 'border-box',
    minHeight: CIBLE,
    minWidth: carre ? CIBLE : undefined,
    width: carre ? CIBLE : opts.etendu ? '100%' : undefined,
    height: carre ? CIBLE : undefined,
    padding: carre ? 0 : genre === 'nav' ? '0 12px' : '0 16px',
    borderRadius: RAYON,
    border: `1px solid ${bords[genre]}`,
    background: fonds[genre],
    color: textes[genre],
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'inherit',
    lineHeight: 1.2,
    letterSpacing: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: carre ? 'center' : opts.etendu || genre === 'nav' ? 'flex-start' : 'center',
    gap: ESPACE,
    cursor: opts.disabled ? 'wait' : 'pointer',
    opacity: opts.disabled ? 0.55 : 1,
    transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s, color 0.15s',
  }
}

interface BoutonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  genre?: GenreBouton
  etendu?: boolean
  carre?: boolean
  children: ReactNode
}

export function Bouton({
  genre = 'secondaire',
  etendu,
  carre,
  disabled,
  style,
  children,
  type = 'button',
  onFocus,
  onBlur,
  ...rest
}: BoutonProps) {
  const { theme: t } = useSite()
  const focus = anneauFocus(t)
  return (
    <button
      type={type}
      disabled={disabled}
      style={{ ...styleBouton(t, { genre, disabled, etendu, carre }), ...style }}
      {...rest}
      onFocus={(e) => { focus.onFocus(e); onFocus?.(e) }}
      onBlur={(e) => { focus.onBlur(e); onBlur?.(e) }}
    >
      {children}
    </button>
  )
}

/**
 * Chrome de l'éditeur — tokens du thème restaurant, pas une palette admin.
 * Cibles ≥ 44 px, focus visible, sentence case.
 */
import type { CSSProperties, FocusEvent } from 'react'
import type { ThemePalette } from '@/config/themes'

export const CIBLE = 44

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
    marginBottom: 8,
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
  const actif = Boolean(opts.actif)
  const primaire = Boolean(opts.primaire)
  const danger = Boolean(opts.danger)
  return {
    minHeight: CIBLE,
    padding: '10px 14px',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    cursor: opts.disabled ? 'wait' : 'pointer',
    border: `1px solid ${danger ? t.accent : primaire || actif ? t.primary : t.shadow}`,
    background: primaire ? t.primary : actif ? `${t.primary}14` : t.surface,
    color: primaire ? '#fff' : danger ? t.accent : actif ? t.primary : t.text,
    transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
  }
}

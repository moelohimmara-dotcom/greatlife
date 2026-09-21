/**
 * Chrome de la console : une seule forme de bouton (Tableau de bord).
 * Dessin Material 3 = 40 px ; zone cliquable Apple/WCAG 2.5.5 = 44 px (classe `admin-btn`).
 * Les primitives de `src/admin/ui.tsx` réutilisent `styleBouton`.
 *
 * Focus : jamais un anneau 2px au clic souris. Le clavier passe par
 * `:focus-visible` (inner, voir `src/index.css`). Pas de `onFocus` → box-shadow.
 */
import { forwardRef, useEffect, useId, useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { Icon } from '@/lib/icons'
import type { ThemePalette } from '@/config/themes'

/** Hauteur visuelle du bouton rempli (Material Design 3). */
export const HAUTEUR = 40
/** Zone cliquable minimale des contrôles principaux (Apple HIG / WCAG 2.2 2.5.5). */
export const CIBLE = 44
export const RAYON = 10
/** Écart entre contrôles (ui-ux-pro-max touch-spacing, Apple HIG, Material). */
export const ESPACE = 8
/** Hauteur visuelle des pastilles d’état (chips M3 24–32, pas un bouton). */
export const HAUTEUR_ETAT = 24
export const CLASSE_BOUTON = 'admin-btn'
/** Carte / tiroir : hover crème via CSS, pas un stroke. */
export const CLASSE_CARTE = 'admin-carte'

export type GenreBouton = 'primaire' | 'secondaire' | 'actif' | 'danger' | 'silencieux' | 'nav'

/** Conservé pour les champs : le dessin est CSS (`.admin-focus:focus-visible`). */
export function anneauFocus(_t: ThemePalette) {
  return { className: 'admin-focus' }
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

/** Libellé d’une nature dans Structure (Mise en page, Blocs). */
export function styleLibelleNature(t: ThemePalette): CSSProperties {
  return {
    fontSize: 12,
    fontWeight: 700,
    color: t.muted,
    marginBottom: ESPACE,
    letterSpacing: '0.02em',
  }
}

/** Carte d’un tiroir (mise en page ou famille de blocs) : bordure, rayon 10. */
export function styleCarteTiroir(t: ThemePalette): CSSProperties {
  return {
    marginBottom: ESPACE,
    border: `1px solid ${t.shadow}`,
    borderRadius: RAYON,
    overflow: 'hidden',
  }
}

/** Rangée d’en-tête d’un tiroir : chevron + titre, hauteur 40, padding 12. */
export function styleEnteteTiroir(): CSSProperties {
  return {
    height: 'auto',
    minHeight: HAUTEUR,
    padding: '0 12px',
    borderRadius: 0,
    border: 'none',
    justifyContent: 'flex-start',
    gap: ESPACE,
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
  busy?: boolean
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
    height: HAUTEUR,
    minHeight: HAUTEUR,
    minWidth: carre ? HAUTEUR : undefined,
    width: carre ? HAUTEUR : opts.etendu ? '100%' : undefined,
    padding: carre ? 0 : '0 12px',
    overflow: 'visible',
    position: 'relative',
    ['--admin-cible' as string]: `${CIBLE}px`,
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
    cursor: opts.disabled ? (opts.busy ? 'wait' : 'default') : 'pointer',
    opacity: opts.disabled ? 0.55 : 1,
    touchAction: 'manipulation',
    transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.12s ease',
  } as CSSProperties
}

interface BoutonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  genre?: GenreBouton
  etendu?: boolean
  carre?: boolean
  busy?: boolean
  children: ReactNode
}

export const Bouton = forwardRef<HTMLButtonElement, BoutonProps>(function Bouton({
  genre = 'secondaire',
  etendu,
  carre,
  busy,
  disabled,
  style,
  className,
  children,
  type = 'button',
  ...rest
}, ref) {
  const { theme: t } = useSite()
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={[CLASSE_BOUTON, className].filter(Boolean).join(' ')}
      style={{ ...styleBouton(t, { genre, disabled, busy, etendu, carre }), ...style }}
      {...rest}
    >
      {children}
    </button>
  )
})

/** Icône décorative à côté du libellé d’un tiroir (aria-hidden : le bouton porte le nom). */
export type IconeTiroir = keyof typeof Icon

/**
 * Tiroir collapsible de la colonne Modifier.
 * Disclosure progressive : fermé par défaut sauf si pertinent pour la sélection.
 */
export function TiroirInspecteur({
  id,
  titre,
  icone,
  ouvertParDefaut = false,
  forcerOuvert,
  compte,
  children,
}: {
  id: string
  titre: string
  icone?: IconeTiroir
  ouvertParDefaut?: boolean
  /** Quand passe à true (ex. emplacement sélectionné), ouvre le tiroir. */
  forcerOuvert?: boolean
  compte?: number
  children: ReactNode
}) {
  const { theme: t } = useSite()
  const baseId = useId()
  const panelId = `${baseId}-${id}`
  const [ouvert, setOuvert] = useState(ouvertParDefaut)

  useEffect(() => {
    setOuvert(ouvertParDefaut)
  }, [ouvertParDefaut, id])

  useEffect(() => {
    if (forcerOuvert) setOuvert(true)
  }, [forcerOuvert])

  const renduIcone = icone && typeof Icon[icone] === 'function' ? Icon[icone] : null

  return (
    <div className={CLASSE_CARTE} style={{ ...styleCarteTiroir(t), marginBottom: ESPACE, overflow: 'visible' }}>
      <Bouton
        etendu
        genre="silencieux"
        aria-expanded={ouvert}
        aria-controls={ouvert ? panelId : undefined}
        aria-label={compte !== undefined ? `${titre}, ${compte}` : titre}
        onClick={() => setOuvert((v) => !v)}
        style={{ ...styleEnteteTiroir(), borderRadius: ouvert ? `${RAYON}px ${RAYON}px 0 0` : RAYON }}
      >
        <span
          aria-hidden="true"
          style={{
            display: 'flex',
            flexShrink: 0,
            transform: ouvert ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 0.15s ease',
          }}
        >
          {Icon.chevronDown(16, t.muted)}
        </span>
        {renduIcone && (
          <span aria-hidden="true" style={{ display: 'flex', flexShrink: 0 }}>
            {renduIcone(16, t.heading)}
          </span>
        )}
        <span
          aria-hidden="true"
          style={{
            flex: 1,
            minWidth: 0,
            textAlign: 'left',
            fontSize: 13,
            fontWeight: 700,
            color: t.heading,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {titre}
        </span>
        {compte !== undefined && (
          <span aria-hidden="true" style={{ fontSize: 12, fontWeight: 600, color: t.muted, flexShrink: 0 }}>
            {compte}
          </span>
        )}
      </Bouton>
      {ouvert && (
        <div id={panelId} style={{ padding: '4px 12px 12px' }}>
          {children}
        </div>
      )}
    </div>
  )
}

/**
 * Couleurs administrables — primitive pure (pas de React, pas de CSS).
 * Une teinte personnalisée est une couleur #RRGGBB ; l’absence signifie « Thème ».
 */
import type { ThemePalette } from '@/config/themes'

const CONTRASTE_MIN = 4.5

export const CONTRASTE_TEXTE_MIN = CONTRASTE_MIN

export const MESSAGE_CONTRASTE =
  'Ce texte sera difficile à lire'

export interface PastilleTheme {
  label: string
  value: string
}

const NEUTRES_LIBRES = new Set(['Crème', 'Blanc', 'Noir'])

/** Pastilles recommandées, puisées dans le thème Apparence. */
export function pastillesDepuisTheme(theme: ThemePalette, against?: string): PastilleTheme[] {
  const vues = new Set<string>()
  const out: PastilleTheme[] = []
  const candidats: PastilleTheme[] = [
    { label: 'Fond du thème', value: theme.bg },
    { label: 'Carte du thème', value: theme.surface },
    { label: 'Fond secondaire du thème', value: theme.surfaceAlt },
    { label: 'Principal du thème', value: theme.primary },
    { label: 'Accent du thème', value: theme.accent },
    { label: 'Or du thème', value: theme.gold },
    { label: 'Crème', value: theme.cream },
    { label: 'Texte du thème', value: theme.text },
    { label: 'Titre du thème', value: theme.heading },
    { label: 'Texte secondaire du thème', value: theme.muted },
    { label: 'Blanc', value: '#FFFFFF' },
    { label: 'Noir', value: '#000000' },
  ]
  const fondConnu = against ? sanitiserHex(against) : null
  for (const p of candidats) {
    const cle = sanitiserHex(p.value)
    if (!cle || vues.has(cle)) continue
    if (NEUTRES_LIBRES.has(p.label) && fondConnu) {
      if (!contrasteSuffisant(fondConnu, cle) && !contrasteSuffisant(cle, fondConnu)) continue
    }
    vues.add(cle)
    out.push({ label: p.label, value: cle })
  }
  return out
}

/** Encre lisible sur une pastille (coche / anneau interne). */
export function encreSurPastille(fond: string): '#FFFFFF' | '#1A1A1A' {
  return contrasteSuffisant(fond, '#FFFFFF') ? '#FFFFFF' : '#1A1A1A'
}

/**
 * Accepte uniquement une couleur à 6 chiffres. Les formes courtes (#RGB)
 * sont étendues. Tout le reste est rejeté (pas de `rgb()`, pas de noms).
 */
export function sanitiserHex(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  let s = raw.trim()
  if (!s) return null
  if (s[0] !== '#') s = `#${s}`
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s)
  if (!m) return null
  let h = m[1]
  if (h.length === 3) h = h.split('').map((ch) => ch + ch).join('')
  return `#${h.toUpperCase()}`
}

export function couleurOuTheme(perso: unknown, theme: string): string {
  return sanitiserHex(perso) ?? theme
}

export function rapportContraste(a: string, b: string): number {
  const l1 = luminanceRel(a)
  const l2 = luminanceRel(b)
  if (l1 === null || l2 === null) return 0
  const clair = Math.max(l1, l2)
  const sombre = Math.min(l1, l2)
  return (clair + 0.05) / (sombre + 0.05)
}

export function contrasteSuffisant(fond: string, texte: string): boolean {
  return rapportContraste(fond, texte) >= CONTRASTE_MIN
}

export function contrasteFaible(fond: string | undefined, texte: string | undefined): boolean {
  if (!fond || !texte) return false
  if (!sanitiserHex(fond) && !fond.startsWith('rgb')) return false
  if (!sanitiserHex(texte) && !texte.startsWith('rgb')) return false
  return !contrasteSuffisant(fond, texte)
}

/** Voile de bannière : repli historique si aucune teinte n’est choisie. */
export function voileBanniere(perso: unknown): string {
  const c = sanitiserHex(perso)
  if (!c) return 'linear-gradient(180deg, rgba(0,0,0,0.45), rgba(0,0,0,0.62))'
  return `linear-gradient(180deg, ${c}73, ${c}9E)`
}

function luminanceRel(couleur: string): number | null {
  const rgb = versRgb(couleur)
  if (!rgb) return null
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function versRgb(couleur: string): [number, number, number] | null {
  const c = couleur.trim()
  const hex = sanitiserHex(c)
  if (hex) {
    const h = hex.slice(1)
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ]
  }
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(c)
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
  return null
}

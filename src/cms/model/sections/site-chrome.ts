/**
 * Cadre du site : en-tête et pied, hors liste des blocs de page (TDR §19).
 * Les identifiants `cms-header` / `cms-footer` servent à la sélection dans
 * Structure et dans l’aperçu — ce ne sont pas des sections `page_sections`.
 */
import type { Bilingue } from '../i18n'
import { resolveI18n, type Locale } from '../i18n'

export const CHROME_HEADER_ID = 'cms-header'
export const CHROME_FOOTER_ID = 'cms-footer'

export type ChromeId = 'header' | 'footer'

export interface LienChrome {
  /** Identifiant d’une entrée `navigation_items`, ou clé locale. */
  id: string
  label: Bilingue
  /** Ancre sans `#`, ou URL. */
  target: string
  visible: boolean
  isCta: boolean
  /** `nav` = déjà en base navigation ; sinon JSON des réglages. */
  source: 'nav' | 'settings'
}

export const LIENS_ENTETE_DEFAUT: readonly Omit<LienChrome, 'source'>[] = [
  { id: 'carte', label: { fr: 'La carte', en: 'Menu' }, target: 'carte', visible: true, isCta: false },
  { id: 'histoire', label: { fr: 'Histoire', en: 'Story' }, target: 'histoire', visible: true, isCta: false },
  { id: 'engagements', label: { fr: 'Engagements', en: 'Commitments' }, target: 'engagements', visible: true, isCta: false },
  { id: 'equipe', label: { fr: 'Équipe', en: 'Team' }, target: 'equipe', visible: true, isCta: false },
  { id: 'loca', label: { fr: 'Nous trouver', en: 'Find us' }, target: 'loca', visible: true, isCta: false },
  { id: 'contact', label: { fr: 'Contact', en: 'Contact' }, target: 'contact', visible: true, isCta: false },
  { id: 'blog', label: { fr: 'Blog', en: 'Journal' }, target: 'blog', visible: true, isCta: false },
  { id: 'reserver', label: { fr: 'Réserver', en: 'Book a table' }, target: 'contact', visible: true, isCta: true },
]

export const LIENS_PIED_DEFAUT: readonly Omit<LienChrome, 'source'>[] = [
  { id: 'carte', label: { fr: 'La carte', en: 'Menu' }, target: 'carte', visible: true, isCta: false },
  { id: 'histoire', label: { fr: 'Histoire', en: 'Story' }, target: 'histoire', visible: true, isCta: false },
  { id: 'engagements', label: { fr: 'Engagements', en: 'Commitments' }, target: 'engagements', visible: true, isCta: false },
  { id: 'equipe', label: { fr: 'Équipe', en: 'Team' }, target: 'equipe', visible: true, isCta: false },
  { id: 'blog', label: { fr: 'Blog', en: 'Journal' }, target: 'blog', visible: true, isCta: false },
]

/** Plafond du menu et du pied (TDR : une liste courte, pas un sitemap). */
export const PLAFOND_LIENS_CHROME = 8

/**
 * Destinations proposées au restaurateur — mêmes familles que les boutons
 * de la bannière et la barre d’annonce. Pas d’adresse http libre.
 */
export const CIBLES_LIEN: readonly { id: string; label: string }[] = [
  { id: 'home', label: 'Accueil' },
  { id: 'carte', label: 'Carte' },
  { id: 'reservation', label: 'Réservation' },
  { id: 'contact', label: 'Contact' },
  { id: 'histoire', label: 'Histoire' },
  { id: 'engagements', label: 'Engagements' },
  { id: 'equipe', label: 'Équipe' },
  { id: 'loca', label: 'Nous trouver' },
  { id: 'blog', label: 'Blog' },
  { id: 'phone', label: 'Téléphone' },
]

export function normaliserCibleLien(target: string): string {
  return target.trim().replace(/^#/, '')
}

export function cibleLienConnue(target: string): boolean {
  const id = normaliserCibleLien(target)
  return CIBLES_LIEN.some((c) => c.id === id)
}

/** Première destination encore libre, hors Téléphone si possible. */
export function ciblePourNouveauLien(existants: readonly LienChrome[]): string {
  const prises = new Set(existants.map((l) => normaliserCibleLien(l.target)))
  const libre = CIBLES_LIEN.find((c) => c.id !== 'phone' && !prises.has(c.id))
  return libre?.id ?? 'carte'
}

export function nouveauLienChrome(existants: readonly LienChrome[]): LienChrome {
  const target = ciblePourNouveauLien(existants)
  return {
    id: `lien-${Date.now().toString(36)}`,
    label: { fr: 'Lien', en: 'Link' },
    target,
    visible: true,
    isCta: false,
    source: 'settings',
  }
}

function asBilingue(value: unknown): Bilingue {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const o = value as Record<string, unknown>
    return {
      fr: typeof o.fr === 'string' ? o.fr : '',
      en: typeof o.en === 'string' ? o.en : '',
    }
  }
  return { fr: '', en: '' }
}

/** Lit une liste de liens stockée dans le JSON des réglages (pas une table). */
export function liensDepuisReglages(raw: unknown): LienChrome[] {
  if (!Array.isArray(raw)) return []
  const out: LienChrome[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const target = typeof o.target === 'string' ? o.target : typeof o.targetValue === 'string' ? o.targetValue : ''
    if (!target) continue
    const id = typeof o.id === 'string' && o.id ? o.id : target
    out.push({
      id,
      label: asBilingue(o.label),
      target,
      visible: o.visible !== false,
      isCta: o.isCta === true || o.is_cta === true,
      source: 'settings',
    })
  }
  return out
}

export function liensVersReglages(liens: readonly LienChrome[]): Record<string, unknown>[] {
  return liens.map((l) => ({
    id: l.id,
    label: l.label,
    target: l.target,
    visible: l.visible,
    isCta: l.isCta,
  }))
}

export function hrefLien(target: string, telephone?: string): string {
  const raw = target.trim()
  if (!raw) return '#'
  const t = raw.replace(/^#/, '')
  if (t === 'phone' || t === 'tel') {
    const tel = (telephone ?? '').replace(/[^\d+]/g, '')
    return tel ? `tel:${tel}` : '#'
  }
  if (raw.startsWith('tel:') || raw.startsWith('/') || raw.startsWith('http://') || raw.startsWith('https://')) return raw
  if (raw.startsWith('#')) return raw
  return `#${t}`
}

export function libelleLien(lien: LienChrome, locale: Locale): string {
  return resolveI18n(lien.label, locale)
}

/** Découpe « Greatlife » pour garder l’accent sur « life » ; sinon le nom entier. */
export function morceauxMarque(nom: string): { avant: string; accent?: string } {
  const trim = nom.trim() || 'Greatlife'
  const m = trim.match(/^(.*)(life)$/i)
  if (m && m[1]) return { avant: m[1], accent: m[2] }
  return { avant: trim }
}

export {
  ANNONCE_CIBLES,
  LOGO_TAILLES,
  chromeDepuisReglages,
  collantEffectif,
  couleursAnnonce,
  couleursEntete,
  couleursPied,
  enteteStructurel,
  fusionnerPresentation,
  hauteurLogoPx,
  hrefAnnonce,
  overlayEffectif,
  piedStructurel,
  presentationVersReglages,
  schemeEntete,
  schemePied,
  schemesDepuisTheme,
  tailleNomLogoPx,
} from './chrome-presentation'
export type {
  AnnonceLien,
  AnnoncePresentation,
  ChromePresentation,
  ChromeScheme,
  CouleursAnnonce,
  CouleursEntete,
  CouleursPied,
  FooterLayout,
  HeaderLayout,
  LogoTaille,
} from './chrome-presentation'

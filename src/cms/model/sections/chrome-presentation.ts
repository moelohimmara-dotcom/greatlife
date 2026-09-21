/**
 * Présentation de l’en-tête et du pied — séparée du contenu (TDR §4).
 * Stockée dans le JSON `site_content.restaurant.chromePresentation`.
 * Jeux nommés = thème Apparence. Chaque élément peut ensuite hériter
 * (Thème) ou porter une couleur personnalisée.
 */
import type { ThemePalette } from '@/config/themes'
import { isTranslation, type Bilingue } from '../i18n'
import { couleurOuTheme, sanitiserHex, contrasteSuffisant, rapportContraste } from './couleur'

export { contrasteSuffisant, rapportContraste }

export type HeaderLayout = 'logoLeft' | 'logoCenter' | 'compact'
export type LogoTaille = 'petit' | 'normal' | 'grand'
export type AnnonceLien = 'reservation' | 'carte' | 'phone'
export type HeaderOverlay = 'solid' | 'overHero'
export type HeaderStick = 'static' | 'stick'
export type ChromeEffect = 'none' | 'shadow' | 'blur'
export type FooterLayout = 'columns' | 'centered' | 'band'

export const HEADER_LAYOUTS: readonly { id: HeaderLayout; label: string; help: string }[] = [
  { id: 'logoLeft', label: 'Logo à gauche', help: 'Nom à gauche, menu à droite — le plus courant.' },
  { id: 'logoCenter', label: 'Logo au centre', help: 'Le nom est centré, le menu en dessous.' },
  { id: 'compact', label: 'Compact', help: 'Bandeau plus bas, moins d’espace.' },
]

export const LOGO_TAILLES: readonly { id: LogoTaille; label: string }[] = [
  { id: 'petit', label: 'Petit' },
  { id: 'normal', label: 'Normal' },
  { id: 'grand', label: 'Grand' },
]

export const ANNONCE_CIBLES: readonly { id: AnnonceLien | ''; label: string }[] = [
  { id: '', label: 'Sans lien' },
  { id: 'reservation', label: 'Réserver' },
  { id: 'carte', label: 'Carte' },
  { id: 'phone', label: 'Téléphone' },
]

export const HEADER_OVERLAYS: readonly { id: HeaderOverlay; label: string; help: string }[] = [
  { id: 'solid', label: 'Collé', help: 'Bandeau opaque au-dessus du contenu.' },
  { id: 'overHero', label: 'Au-dessus de la bannière', help: 'Transparent sur la photo, texte clair.' },
]

export const CHROME_EFFECTS: readonly { id: ChromeEffect; label: string }[] = [
  { id: 'none', label: 'Aucun' },
  { id: 'shadow', label: 'Ombre' },
  { id: 'blur', label: 'Flou' },
]

export const FOOTER_LAYOUTS: readonly { id: FooterLayout; label: string; help: string }[] = [
  { id: 'columns', label: 'Colonnes', help: 'Nom, liens et contact côte à côte.' },
  { id: 'centered', label: 'Centré', help: 'Tout aligné au milieu.' },
  { id: 'band', label: 'Gros bandeau', help: 'Bande large, réseaux bien visibles.' },
]

export const FOOTER_EFFECTS: readonly { id: Exclude<ChromeEffect, 'blur'>; label: string }[] = [
  { id: 'none', label: 'Aucun' },
  { id: 'shadow', label: 'Ombre' },
]

export interface ChromeScheme {
  id: string
  label: string
  bg: string
  text: string
  accent: string
}

export interface HeaderPresentation {
  layout?: HeaderLayout
  overlay?: HeaderOverlay
  stick?: HeaderStick
  effect?: ChromeEffect
  scheme?: string
  /** Fond du bandeau. Absent = thème / jeu nommé. */
  bg?: string
  /** Texte du nom et des liens. */
  text?: string
  /** Lien actif, survol, accent du nom. */
  accent?: string
  /** Fond du bouton Réserver. */
  ctaBg?: string
  /** Texte du bouton Réserver. */
  ctaText?: string
  /** Adresse d’une image de logo (JSON restaurant / chrome). Absent = nom. */
  logoUrl?: string
  logoSize?: LogoTaille
  announcement?: AnnoncePresentation
}

export interface AnnoncePresentation {
  visible?: boolean
  /** Texte court bilingue. */
  message?: Bilingue
  link?: AnnonceLien | ''
  bg?: string
  fg?: string
}

export interface CouleursAnnonce {
  bg: string
  fg: string
}

export interface FooterPresentation {
  layout?: FooterLayout
  effect?: Exclude<ChromeEffect, 'blur'>
  scheme?: string
  bg?: string
  text?: string
  /** Liens de navigation. */
  links?: string
  /** Liens des réseaux. */
  social?: string
  /** Survol des liens et accent du nom. */
  accent?: string
}

export interface CouleursEntete {
  bg: string
  text: string
  accent: string
  ctaBg: string
  ctaText: string
}

export interface CouleursPied {
  bg: string
  text: string
  links: string
  social: string
  accent: string
}

export interface ChromePresentation {
  header?: HeaderPresentation
  footer?: FooterPresentation
}

const HEADER_LAYOUT_IDS: readonly string[] = HEADER_LAYOUTS.map((x) => x.id)
const LOGO_TAILLE_IDS: readonly string[] = LOGO_TAILLES.map((x) => x.id)
const ANNONCE_LIEN_IDS: readonly string[] = ANNONCE_CIBLES.map((x) => x.id).filter(Boolean)
const OVERLAY_IDS: readonly string[] = HEADER_OVERLAYS.map((x) => x.id)
const STICK_IDS: readonly string[] = ['static', 'stick']
const EFFECT_IDS: readonly string[] = CHROME_EFFECTS.map((x) => x.id)
const FOOTER_LAYOUT_IDS: readonly string[] = FOOTER_LAYOUTS.map((x) => x.id)
const FOOTER_EFFECT_IDS: readonly string[] = FOOTER_EFFECTS.map((x) => x.id)

/**
 * Jeux de couleurs nommés, tous puisés dans le thème courant.
 * Un couple fond/texte sous 4,5:1 n’est pas proposé.
 */
export function schemesDepuisTheme(theme: ThemePalette): ChromeScheme[] {
  const candidats: Array<{ id: string; label: string; fonds: string[]; textes: string[]; accents: string[] }> = [
    {
      id: 'surface',
      label: 'Clair',
      fonds: [theme.surface],
      textes: [theme.text, theme.heading, theme.primaryDark],
      accents: [theme.accent, theme.primary, theme.gold],
    },
    {
      id: 'cream',
      label: 'Crème',
      fonds: [theme.cream],
      textes: [theme.text, theme.heading, theme.primaryDark],
      accents: [theme.primary, theme.accent, theme.gold],
    },
    {
      id: 'leaf',
      label: 'Vert Greatlife',
      fonds: [theme.primary],
      textes: [theme.headingInvert, theme.cream, theme.surface],
      accents: [theme.gold, theme.cream, theme.accentSoft],
    },
    {
      id: 'ink',
      label: 'Sombre',
      fonds: [theme.primaryDark, theme.bg],
      textes: [theme.headingInvert, theme.cream, theme.surface, theme.text],
      accents: [theme.gold, theme.accentSoft, theme.cream],
    },
  ]

  const out: ChromeScheme[] = []
  for (const c of candidats) {
    let choisi: ChromeScheme | undefined
    for (const bg of c.fonds) {
      const text = c.textes.find((couleur) => contrasteSuffisant(bg, couleur))
      if (!text) continue
      const accent = c.accents.find((couleur) => contrasteSuffisant(bg, couleur)) ?? text
      choisi = { id: c.id, label: c.label, bg, text, accent }
      break
    }
    if (choisi) out.push(choisi)
  }
  return out
}

export function schemeParId(theme: ThemePalette, id: string | undefined): ChromeScheme | undefined {
  if (!id) return undefined
  return schemesDepuisTheme(theme).find((s) => s.id === id)
}

export function schemeEntete(theme: ThemePalette, presentation: ChromePresentation | undefined): ChromeScheme {
  return schemeParId(theme, presentation?.header?.scheme)
    ?? repli('surface', theme)
}

export function schemePied(theme: ThemePalette, presentation: ChromePresentation | undefined): ChromeScheme {
  return schemeParId(theme, presentation?.footer?.scheme)
    ?? repli('ink', theme)
}

/** Mise en page / jeu nommé — pas les seules couleurs personnalisées. */
export function enteteStructurel(presentation: ChromePresentation | undefined): boolean {
  const h = presentation?.header
  if (!h) return false
  return Boolean(h.layout || h.overlay || h.stick || h.effect || h.scheme)
}

export function piedStructurel(presentation: ChromePresentation | undefined): boolean {
  const f = presentation?.footer
  if (!f) return false
  return Boolean(f.layout || f.effect || f.scheme)
}

export function couleursEntete(theme: ThemePalette, presentation: ChromePresentation | undefined): CouleursEntete {
  const scheme = schemeEntete(theme, presentation)
  const h = presentation?.header
  const structure = enteteStructurel(presentation)
  return {
    bg: couleurOuTheme(h?.bg, structure ? scheme.bg : theme.surface),
    text: couleurOuTheme(h?.text, structure ? scheme.text : theme.text),
    accent: couleurOuTheme(h?.accent, structure ? scheme.accent : theme.accent),
    ctaBg: couleurOuTheme(h?.ctaBg, theme.primary),
    ctaText: couleurOuTheme(h?.ctaText, '#FFFFFF'),
  }
}

export function couleursPied(theme: ThemePalette, presentation: ChromePresentation | undefined): CouleursPied {
  const scheme = schemePied(theme, presentation)
  const f = presentation?.footer
  const structure = piedStructurel(presentation)
  const texte = couleurOuTheme(f?.text, structure ? scheme.text : '#FFFFFF')
  const liens = couleurOuTheme(f?.links, structure ? scheme.text : 'rgba(255,255,255,0.8)')
  return {
    bg: couleurOuTheme(f?.bg, structure ? scheme.bg : theme.primaryDark),
    text: texte,
    links: liens,
    social: couleurOuTheme(f?.social, liens),
    accent: couleurOuTheme(f?.accent, structure ? scheme.accent : theme.gold),
  }
}

function repli(id: 'surface' | 'ink', theme: ThemePalette): ChromeScheme {
  const trouve = schemesDepuisTheme(theme).find((s) => s.id === id)
  if (trouve) return trouve
  const premier = schemesDepuisTheme(theme)[0]
  if (premier) return premier
  return { id: 'surface', label: 'Clair', bg: theme.surface, text: theme.text, accent: theme.accent }
}

export function chromeDepuisReglages(raw: unknown): ChromePresentation {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const blob = raw as Record<string, unknown>
  const racine = blob.chromePresentation
  const o = racine && typeof racine === 'object' && !Array.isArray(racine)
    ? (racine as Record<string, unknown>)
    : {}
  const header = lireEntete(o.header) ?? {}
  const logoRacine = typeof blob.logoUrl === 'string' ? blob.logoUrl.trim() : ''
  if (!header.logoUrl && logoRacine) header.logoUrl = logoRacine
  return {
    header: Object.keys(header).length > 0 ? header : undefined,
    footer: lirePied(o.footer),
  }
}

export function fusionnerPresentation(
  actuel: ChromePresentation,
  patch: ChromePresentation,
): ChromePresentation {
  const headerPatch = patch.header
  const footerPatch = patch.footer
  return {
    header: headerPatch
      ? {
          ...actuel.header,
          ...headerPatch,
          announcement: headerPatch.announcement
            ? { ...actuel.header?.announcement, ...headerPatch.announcement }
            : actuel.header?.announcement,
        }
      : actuel.header,
    footer: footerPatch ? { ...actuel.footer, ...footerPatch } : actuel.footer,
  }
}

export function couleursAnnonce(theme: ThemePalette, presentation: ChromePresentation | undefined): CouleursAnnonce {
  const a = presentation?.header?.announcement
  const bg = couleurOuTheme(a?.bg, theme.primary)
  const repliFg = contrasteSuffisant(bg, theme.headingInvert) ? theme.headingInvert : '#FFFFFF'
  return {
    bg,
    fg: couleurOuTheme(a?.fg, repliFg),
  }
}

export function hrefAnnonce(link: AnnonceLien | '' | undefined, phone: string): string | null {
  if (link === 'carte') return '#carte'
  if (link === 'reservation') return '#reservation'
  if (link === 'phone') {
    const tel = phone.replace(/[^\d+]/g, '')
    return tel ? `tel:${tel}` : null
  }
  return null
}

export function hauteurLogoPx(taille: LogoTaille | undefined, compact: boolean): number {
  const base = taille === 'petit' ? 28 : taille === 'grand' ? 56 : 40
  return compact ? Math.round(base * 0.8) : base
}

export function tailleNomLogoPx(taille: LogoTaille | undefined, compact: boolean): number {
  const base = taille === 'petit' ? 18 : taille === 'grand' ? 32 : 24
  return compact ? Math.round(base * 0.85) : base
}

export function presentationVersReglages(p: ChromePresentation): Record<string, unknown> {
  const headerBrut = p.header ? { ...p.header } as Record<string, unknown> : undefined
  if (headerBrut && p.header?.announcement) {
    headerBrut.announcement = sansVides(p.header.announcement as Record<string, unknown>)
  }
  const header = headerBrut ? sansVides(headerBrut) : undefined
  const footer = p.footer ? sansVides(p.footer as Record<string, unknown>) : undefined
  const out: Record<string, unknown> = {}
  if (header && Object.keys(header).length > 0) out.header = header
  if (footer && Object.keys(footer).length > 0) out.footer = footer
  return out
}

/** Overlay explicite, sinon le choix de mise en page de la page. */
export function overlayEffectif(
  presentation: ChromePresentation | undefined,
  overlayPage: boolean,
): boolean {
  const choix = presentation?.header?.overlay
  if (choix === 'overHero') return true
  if (choix === 'solid') return false
  return overlayPage
}

export function collantEffectif(presentation: ChromePresentation | undefined): boolean {
  return presentation?.header?.stick !== 'static'
}

function lireEntete(raw: unknown): HeaderPresentation | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const o = raw as Record<string, unknown>
  const header: HeaderPresentation = {}
  if (typeof o.layout === 'string' && HEADER_LAYOUT_IDS.includes(o.layout)) {
    header.layout = o.layout as HeaderLayout
  }
  if (typeof o.overlay === 'string' && OVERLAY_IDS.includes(o.overlay)) {
    header.overlay = o.overlay as HeaderOverlay
  }
  if (typeof o.stick === 'string' && STICK_IDS.includes(o.stick)) {
    header.stick = o.stick as HeaderStick
  }
  if (typeof o.effect === 'string' && EFFECT_IDS.includes(o.effect)) {
    header.effect = o.effect as ChromeEffect
  }
  if (typeof o.scheme === 'string' && o.scheme) header.scheme = o.scheme
  const bg = lireCouleur(o.bg)
  const text = lireCouleur(o.text)
  const accent = lireCouleur(o.accent)
  const ctaBg = lireCouleur(o.ctaBg)
  const ctaText = lireCouleur(o.ctaText)
  if (bg) header.bg = bg
  if (text) header.text = text
  if (accent) header.accent = accent
  if (ctaBg) header.ctaBg = ctaBg
  if (ctaText) header.ctaText = ctaText
  if (typeof o.logoUrl === 'string' && o.logoUrl.trim()) header.logoUrl = o.logoUrl.trim()
  if (typeof o.logoSize === 'string' && LOGO_TAILLE_IDS.includes(o.logoSize)) {
    header.logoSize = o.logoSize as LogoTaille
  }
  const annonce = lireAnnonce(o.announcement)
  if (annonce) header.announcement = annonce
  return Object.keys(header).length > 0 ? header : undefined
}

function lirePied(raw: unknown): FooterPresentation | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const o = raw as Record<string, unknown>
  const footer: FooterPresentation = {}
  if (typeof o.layout === 'string' && FOOTER_LAYOUT_IDS.includes(o.layout)) {
    footer.layout = o.layout as FooterLayout
  }
  if (typeof o.effect === 'string' && FOOTER_EFFECT_IDS.includes(o.effect)) {
    footer.effect = o.effect as Exclude<ChromeEffect, 'blur'>
  }
  if (typeof o.scheme === 'string' && o.scheme) footer.scheme = o.scheme
  const bg = lireCouleur(o.bg)
  const text = lireCouleur(o.text)
  const links = lireCouleur(o.links)
  const social = lireCouleur(o.social)
  const accent = lireCouleur(o.accent)
  if (bg) footer.bg = bg
  if (text) footer.text = text
  if (links) footer.links = links
  if (social) footer.social = social
  if (accent) footer.accent = accent
  return Object.keys(footer).length > 0 ? footer : undefined
}

function sansVides(o: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(o)) {
    if (v !== undefined && v !== null && v !== '') out[k] = v
  }
  return out
}

function lireCouleur(raw: unknown): string | undefined {
  return sanitiserHex(raw) ?? undefined
}

function asBilingue(value: unknown): Bilingue {
  if (typeof value === 'string') return value
  if (isTranslation(value)) return { fr: value.fr ?? '', en: value.en ?? '' }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const o = value as Record<string, unknown>
    return {
      fr: typeof o.fr === 'string' ? o.fr : '',
      en: typeof o.en === 'string' ? o.en : '',
    }
  }
  return { fr: '', en: '' }
}

function lireAnnonce(raw: unknown): AnnoncePresentation | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const o = raw as Record<string, unknown>
  const a: AnnoncePresentation = {}
  if (typeof o.visible === 'boolean') a.visible = o.visible
  if (o.message !== undefined) a.message = asBilingue(o.message)
  if (typeof o.link === 'string' && (o.link === '' || ANNONCE_LIEN_IDS.includes(o.link))) {
    a.link = o.link as AnnonceLien | ''
  }
  const bg = lireCouleur(o.bg)
  const fg = lireCouleur(o.fg)
  if (bg) a.bg = bg
  if (fg) a.fg = fg
  return Object.keys(a).length > 0 ? a : undefined
}

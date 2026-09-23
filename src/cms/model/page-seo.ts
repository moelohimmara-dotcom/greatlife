/**
 * SEO de page — noyau pur (TDR §26, lot J7).
 * Pas de DOM, pas de Supabase : vérifiable en Node.
 *
 * Vocabulaire restaurateur (UI) :
 *   title       → Titre Google
 *   description → Texte de partage
 *   image       → Image de partage
 *   noindex     → Masquer des moteurs de recherche
 */

import { isTranslation, resolveI18n, type Bilingue, type Locale, DEFAULT_LOCALE } from './i18n'
import type { PageSeo } from './page'

/** SEO résolu dans une langue, prêt pour `<title>` / meta / OG. */
export interface ResolvedPageSeo {
  title: string
  description: string
  image: string
  canonical: string
  noindex: boolean
}

/** Meta à poser sur le document (hors `<title>`). */
export interface DocumentSeoTag {
  attr: 'name' | 'property'
  key: string
  content: string
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function lireBilingue(value: unknown): Bilingue | undefined {
  if (typeof value === 'string') return value
  if (isTranslation(value)) return value
  return undefined
}

/** Normalise un JSON `pages.seo` (ou fragment d’instantané). */
export function normaliserPageSeo(raw: unknown): PageSeo {
  const o = asRecord(raw)
  const seo: PageSeo = {}
  const title = lireBilingue(o.title)
  const description = lireBilingue(o.description)
  if (title !== undefined) seo.title = title
  if (description !== undefined) seo.description = description
  if (typeof o.image === 'string' && o.image.trim()) seo.image = o.image.trim()
  if (typeof o.canonical === 'string' && o.canonical.trim()) seo.canonical = o.canonical.trim()
  if (o.noindex === true) seo.noindex = true
  return seo
}

/** Résout le SEO dans la langue demandée (repli FR, CM-5). */
export function resoudrePageSeo(
  seo: PageSeo | null | undefined,
  locale: Locale = DEFAULT_LOCALE,
): ResolvedPageSeo {
  const n = normaliserPageSeo(seo ?? {})
  return {
    title: resolveI18n(n.title, locale).trim(),
    description: resolveI18n(n.description, locale).trim(),
    image: (n.image ?? '').trim(),
    canonical: (n.canonical ?? '').trim(),
    noindex: n.noindex === true,
  }
}

/**
 * Écrit une valeur bilingue pour une locale (conserve l’autre langue).
 */
export function ecrireSeoLocale(
  seo: PageSeo,
  champ: 'title' | 'description',
  locale: Locale,
  texte: string,
): PageSeo {
  const avant = seo[champ]
  const base: Record<string, string> = isTranslation(avant)
    ? { ...avant }
    : typeof avant === 'string'
      ? { fr: avant }
      : { fr: '', en: '' }
  return { ...seo, [champ]: { ...base, [locale]: texte } }
}

/**
 * Liste des balises document à synchroniser.
 * Les champs vides sont omis : on ne vide pas le socle `index.html` par mégarde.
 */
export function balisesSeoDocument(resolved: ResolvedPageSeo): DocumentSeoTag[] {
  const tags: DocumentSeoTag[] = []
  if (resolved.description) {
    tags.push({ attr: 'name', key: 'description', content: resolved.description })
  }
  if (resolved.title) {
    tags.push({ attr: 'property', key: 'og:title', content: resolved.title })
    tags.push({ attr: 'name', key: 'twitter:title', content: resolved.title })
  }
  if (resolved.description) {
    tags.push({ attr: 'property', key: 'og:description', content: resolved.description })
    tags.push({ attr: 'name', key: 'twitter:description', content: resolved.description })
  }
  if (resolved.image) {
    tags.push({ attr: 'property', key: 'og:image', content: resolved.image })
    tags.push({ attr: 'name', key: 'twitter:image', content: resolved.image })
  }
  if (resolved.noindex) {
    tags.push({ attr: 'name', key: 'robots', content: 'noindex, nofollow' })
  }
  return tags
}

/**
 * Applique le SEO résolu sur un `Document` (navigateur).
 * Ne touche pas aux balises dont le contenu CMS est vide.
 */
export function appliquerSeoDocument(doc: Document, resolved: ResolvedPageSeo): void {
  if (resolved.title) doc.title = resolved.title

  for (const tag of balisesSeoDocument(resolved)) {
    upsertMeta(doc, tag.attr, tag.key, tag.content)
  }

  if (resolved.canonical) {
    let link = doc.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
    if (!link) {
      link = doc.createElement('link')
      link.setAttribute('rel', 'canonical')
      doc.head.appendChild(link)
    }
    link.setAttribute('href', resolved.canonical)
  }
}

function upsertMeta(
  doc: Document,
  attr: 'name' | 'property',
  key: string,
  content: string,
): void {
  const selector = `meta[${attr}="${cssEscape(key)}"]`
  let el = doc.head.querySelector(selector) as HTMLMetaElement | null
  if (!el) {
    el = doc.createElement('meta')
    el.setAttribute(attr, key)
    doc.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/** Échappement minimal pour attributs CSS (clés SEO connues, sans guillemets). */
function cssEscape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

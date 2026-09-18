/**
 * Greatlife — CMS : gestion des langues
 * ======================================
 * Décision CM-1 : le contenu éditorial est stocké sous forme d'objet de
 * traduction par champ — `{ fr: "…", en: "…" }`.
 *
 * Décision CM-5 : le français est la langue de repli. Un champ sans traduction
 * anglaise n'affiche JAMAIS de trou : le français est servi à la place.
 *
 * Décision CM-6 : la langue vit dans le préfixe d'URL (`/en/…`), pas en base.
 * Il n'y a donc qu'un seul slug par page.
 */

export const LOCALES = ['fr', 'en'] as const
export type Locale = (typeof LOCALES)[number]

/** Langue de repli, utilisée dès qu'une traduction est absente. */
export const DEFAULT_LOCALE: Locale = 'fr'

/**
 * Une valeur traduisible.
 *
 * - `string` — valeur non traduite (ex. un numéro de téléphone, une devise).
 * - `{ fr?, en? }` — valeur traduisible.
 *
 * Les deux formes coexistent volontairement : la plupart des champs sont
 * traduisibles, mais certains ne le sont pas par nature (téléphone, email).
 */
export type Bilingue = string | Partial<Record<Locale, string>>

/**
 * `true` si la valeur est un objet de traduction.
 *
 * Détection STRICTE : toutes les clés doivent être des codes de langue.
 * Sans cette précaution, un objet imbriqué comme `{ label: { fr: "…" } }`
 * serait pris pour une traduction et rendu tel quel.
 */
export function isTranslation(value: unknown): value is Partial<Record<Locale, string>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const entries = Object.entries(value as Record<string, unknown>)
  if (entries.length === 0) return false
  // Toutes les clés doivent être des codes de langue ET toutes les valeurs des
  // chaînes. Sans le second test, `{ fr: 42 }` passerait pour une traduction
  // et se résoudrait en chaîne vide — la donnée serait silencieusement perdue.
  return entries.every(
    ([k, v]) => (LOCALES as readonly string[]).includes(k) && typeof v === 'string',
  )
}

/** Enveloppe une chaîne en objet de traduction français. */
export function fr(value: string): Bilingue {
  return { fr: value }
}

/**
 * Résout une valeur traduisible dans la langue demandée.
 *
 * Ordre : langue demandée → langue de repli → chaîne vide.
 * Ne lève jamais d'erreur : une traduction manquante n'est pas une panne,
 * c'est un état normal (le contenu anglais se remplit progressivement).
 */
export function resolveI18n(value: Bilingue | null | undefined, locale: Locale = DEFAULT_LOCALE): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  const exact = value[locale]
  if (typeof exact === 'string' && exact.length > 0) return exact
  const fallback = value[DEFAULT_LOCALE]
  if (typeof fallback === 'string' && fallback.length > 0) return fallback
  // Dernier recours : la première langue renseignée, quelle qu'elle soit.
  for (const l of LOCALES) {
    const v = value[l]
    if (typeof v === 'string' && v.length > 0) return v
  }
  return ''
}

/**
 * Résout une liste de valeurs traduisibles.
 * L'ordre et la longueur sont PRÉSERVÉS (index alignés), pour permettre
 * d'associer une liste de libellés à une liste d'icônes.
 */
export function resolveI18nList(
  values: readonly Bilingue[] | null | undefined,
  locale: Locale = DEFAULT_LOCALE,
): string[] {
  if (!values) return []
  return values.map((v) => resolveI18n(v, locale))
}

/**
 * Résout RÉCURSIVEMENT une structure de contenu dans la langue demandée.
 *
 * C'est le point unique de résolution des langues (décision AR-3) : après cet
 * appel, plus aucun composant n'a connaissance du multilinguisme — il reçoit
 * du texte prêt à afficher.
 *
 *   { title: { fr: "…", en: "…" }, items: [{ fr: "…" }] }
 *        ↓  resolveDeep(…, 'en')
 *   { title: "…", items: ["…"] }
 */
/**
 * Clés qui ne doivent JAMAIS être recopiées dans un objet résolu.
 *
 * `Object.entries` ne remonte pas la chaîne de prototypes, mais une affectation
 * simple `out[key] = …` avec `key === '__proto__'` MODIFIE LE PROTOTYPE de
 * `out` au lieu de créer une clé. Une valeur hostile stockée en jsonb suffirait
 * donc à polluer l'objet résolu. Ces clés n'ont aucun usage éditorial légitime :
 * on les ignore.
 */
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

export function resolveDeep(value: unknown, locale: Locale): unknown {
  if (isTranslation(value)) return resolveI18n(value, locale)
  if (Array.isArray(value)) return value.map((v) => resolveDeep(v, locale))
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (FORBIDDEN_KEYS.has(key)) continue
      out[key] = resolveDeep(v, locale)
    }
    return out
  }
  return value
}

/** Version typée de `resolveDeep` pour un objet de contenu. */
export function resolveContentObject(
  content: Record<string, unknown>,
  locale: Locale,
): Record<string, unknown> {
  return resolveDeep(content, locale) as Record<string, unknown>
}

/** Indique si une traduction existe dans la langue demandée. */
export function hasTranslation(value: Bilingue | null | undefined, locale: Locale): boolean {
  if (!value) return false
  if (typeof value === 'string') return locale === DEFAULT_LOCALE && value.length > 0
  const v = value[locale]
  return typeof v === 'string' && v.length > 0
}

/**
 * Déduit la langue d'un chemin d'URL (décision CM-6).
 * `/en` et `/en/carte` → anglais ; tout le reste → langue par défaut.
 */
export function localeFromPath(pathname: string): { locale: Locale; path: string } {
  const segments = pathname.split('/').filter(Boolean)
  const first = segments[0]?.toLowerCase()
  // Tout préfixe de langue est retiré, y compris celui de la langue par défaut :
  // sinon `/fr/x` rendrait `/fr/x` alors que `pathFor('fr', 'x')` rend `/x`,
  // et l'aller-retour serait incohérent.
  if (first && (LOCALES as readonly string[]).includes(first)) {
    return {
      locale: first as Locale,
      path: '/' + segments.slice(1).join('/'),
    }
  }
  return { locale: DEFAULT_LOCALE, path: pathname }
}

/** Construit un chemin d'URL pour une langue et un slug. */
export function pathFor(locale: Locale, slug: string): string {
  const clean = slug.replace(/^\/+|\/+$/g, '')
  if (locale === DEFAULT_LOCALE) return '/' + clean
  return '/' + locale + (clean ? '/' + clean : '')
}

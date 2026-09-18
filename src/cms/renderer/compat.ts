/**
 * Greatlife — CMS : pont entre l'ancien et le nouveau modèle
 * ===========================================================
 * Pendant la transition (décision AR-5), les composants de section doivent
 * fonctionner dans DEUX contextes :
 *
 *   1. **ancien** — `PublicSite` les monte sans props ; ils lisent alors les
 *      données du blob via `useSite()`. Comportement inchangé.
 *   2. **CMS** — le renderer leur passe `content` ; ils utilisent ces valeurs.
 *
 * C'est ce qui rend la non-régression du TDR §41 **démontrable** : tant que le
 * basculement n'a pas eu lieu, le chemin ancien reste celui qui est servi.
 *
 * ⚠️ Ces helpers sont TEMPORAIRES : ils disparaîtront avec l'ancien modèle,
 * une fois le basculement effectué (décision CM-12).
 */

/**
 * Choisit la valeur du CMS si elle est renseignée, sinon la valeur historique.
 * Une chaîne vide ou une liste vide compte comme « non renseignée » : le
 * restaurateur n'a pas encore rempli ce champ, on garde l'ancien affichage.
 */
export function pick<T>(cmsValue: T | undefined | null, legacyValue: T): T {
  if (cmsValue === undefined || cmsValue === null) return legacyValue
  if (typeof cmsValue === 'string' && cmsValue.trim() === '') return legacyValue
  if (Array.isArray(cmsValue) && cmsValue.length === 0) return legacyValue
  return cmsValue
}

/** Lit une chaîne dans un contenu déjà résolu dans la langue active. */
export function cmsText(
  content: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = content?.[key]
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

/** Lit une liste d'objets dans un contenu déjà résolu. */
export function cmsList<T>(
  content: Record<string, unknown> | undefined,
  key: string,
): T[] | undefined {
  const value = content?.[key]
  return Array.isArray(value) && value.length > 0 ? (value as T[]) : undefined
}

/** Lit une liste de chaînes. */
export function cmsTextList(
  content: Record<string, unknown> | undefined,
  key: string,
): string[] | undefined {
  const value = content?.[key]
  if (!Array.isArray(value) || value.length === 0) return undefined
  const out = value.filter((v): v is string => typeof v === 'string' && v.trim() !== '')
  return out.length > 0 ? out : undefined
}

/** Lit un nombre. */
export function cmsNumber(
  content: Record<string, unknown> | undefined,
  key: string,
): number | undefined {
  const value = content?.[key]
  if (typeof value === 'number') return value
  if (typeof value === 'string' && /^-?\d+([.,]\d+)?$/.test(value.trim())) {
    return Number(value.replace(',', '.'))
  }
  return undefined
}

/** Lit le premier élément d'une liste à un seul élément (bouton, étiquette…). */
export function cmsFirst<T>(
  content: Record<string, unknown> | undefined,
  key: string,
): T | undefined {
  const list = cmsList<T>(content, key)
  return list?.[0]
}

/**
 * Lit un champ `group` — un OBJET unique, pas une liste.
 * Ex. `badge` du Hero, `primaryCta`. Un objet vide compte comme absent.
 */
export function cmsGroup(
  content: Record<string, unknown> | undefined,
  key: string,
): Record<string, unknown> | undefined {
  const value = content?.[key]
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const record = value as Record<string, unknown>
  return Object.keys(record).length > 0 ? record : undefined
}

/**
 * Construit un lien d'ancre.
 * Le contenu stocke une cible SANS `#` ; le rendu a besoin du `#`.
 */
export function anchorHref(target: string): string {
  return target.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(target) ? target : `#${target}`
}

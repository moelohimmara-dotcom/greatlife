/**
 * Texte alternatif des médias CMS — résolution pour le site public.
 *
 * Ordre : `alt_text` persisté → nom de fichier (sans extension) → libellé métier
 * fourni par l’appelant (nom du plat, membre, article…). Aucun contenu restaurant
 * n’est codé en dur ici.
 */

export interface MediaAltSource {
  alt_text?: string | null
  filename?: string | null
  slot?: string
  url?: string
}

/** Première chaîne non vide après trim. */
export function coalesceAlt(...candidates: Array<string | null | undefined>): string {
  for (const c of candidates) {
    const t = (c ?? '').trim()
    if (t) return t
  }
  return ''
}

/** Nom de fichier sans chemin ni extension, espaces à la place de `_` / `-`. */
export function filenameStem(filename: string | null | undefined): string {
  if (!filename) return ''
  const base = filename.split(/[\\/]/).pop() ?? filename
  return base
    .replace(/\.[a-z0-9]{1,8}$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Alt pour un média de la médiathèque.
 * @param fallbackLabel libellé métier (plat, membre, titre d’article…) — pas un texte marketing inventé.
 */
export function resolveMediaAlt(
  asset: MediaAltSource | null | undefined,
  fallbackLabel?: string,
): string {
  return coalesceAlt(asset?.alt_text, filenameStem(asset?.filename), fallbackLabel)
}

export function findMediaBySlot<T extends MediaAltSource>(
  media: readonly T[],
  slot: string,
): T | undefined {
  return media.find((m) => m.slot === slot && Boolean(m.url))
}

export function findFirstMediaBySlots<T extends MediaAltSource>(
  media: readonly T[],
  slots: readonly string[],
): T | undefined {
  for (const slot of slots) {
    const hit = findMediaBySlot(media, slot)
    if (hit) return hit
  }
  return undefined
}

/** Retrouve un média par son URL publique (champs image CMS stockent l’URL). */
export function findMediaByUrl<T extends MediaAltSource>(
  media: readonly T[],
  url: string | null | undefined,
): T | undefined {
  const target = (url ?? '').trim()
  if (!target) return undefined
  return media.find((m) => (m.url ?? '').trim() === target)
}

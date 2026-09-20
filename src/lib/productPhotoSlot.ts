import type { MenuItem } from '@/data/menu'

/**
 * Emplacement d'une photo de plat.
 *
 * L'identité du plat est `menu_items.id`. Dériver l'emplacement du NOM cassait
 * la photo au renommage (« Le Greatlife » → « Le Greatlife Spécial ») et aux
 * accents (« Mangue fraîche » → `mangue-fra-che` au lieu de `mangue-fraiche`).
 */
export function productPhotoSlotId(itemId: string): string {
  return `produit-${itemId}`
}

export function slugifyMenuName(name: string, foldAccents: boolean): string {
  const base = foldAccents
    ? name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    : name
  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Ordre : identité stable, puis slugs du nom (repli avant migration / démo). */
export function productPhotoCandidates(item: Pick<MenuItem, 'id' | 'name'>): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const add = (slot: string) => {
    if (!slot || seen.has(slot)) return
    seen.add(slot)
    out.push(slot)
  }
  if (item.id) add(productPhotoSlotId(item.id))
  add(`produit-${slugifyMenuName(item.name, true)}`)
  add(`produit-${slugifyMenuName(item.name, false)}`)
  return out
}

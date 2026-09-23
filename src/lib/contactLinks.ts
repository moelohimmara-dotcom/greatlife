/**
 * Liens de contact publics (WhatsApp, téléphone, carte).
 * Pure : numéros / textes → URL ; aucune invention de schéma CMS.
 */

/** Chiffres utiles pour `tel:` / `wa.me` (garde un `+` initial si présent). */
export function chiffresTelephone(raw: string): string {
  const trim = raw.trim()
  if (!trim) return ''
  const digits = trim.replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) return `+${digits.slice(1).replace(/\D/g, '')}`
  return digits.replace(/\D/g, '')
}

/**
 * `https://wa.me/…` à partir d’un numéro (`+224…`) ou d’une URL déjà valide.
 * Renvoie `null` si la valeur ne permet pas un lien cliquable.
 */
export function lienWhatsApp(raw: string | null | undefined): string | null {
  const trim = (raw ?? '').trim()
  if (!trim) return null
  if (/^https?:\/\//i.test(trim)) {
    try {
      const u = new URL(trim)
      if (/wa\.me$/i.test(u.hostname) || /whatsapp\.com$/i.test(u.hostname) || u.hostname.endsWith('.whatsapp.com')) {
        return u.toString()
      }
    } catch {
      return null
    }
    return trim
  }
  const digits = chiffresTelephone(trim).replace(/^\+/, '')
  if (digits.length < 8) return null
  return `https://wa.me/${digits}`
}

/** `tel:+…` à partir d’un numéro affiché. */
export function lienTel(raw: string | null | undefined): string | null {
  const digits = chiffresTelephone(raw ?? '')
  if (!digits || digits.replace(/\D/g, '').length < 6) return null
  return `tel:${digits}`
}

/**
 * Lien « Nous trouver » via recherche Google Maps sur l’adresse déjà saisie
 * (pas de champ URL dédié — porte de phase pour embed / URL figée).
 */
export function lienMapsRecherche(adresse: string | null | undefined): string | null {
  const trim = (adresse ?? '').trim()
  if (!trim) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trim)}`
}

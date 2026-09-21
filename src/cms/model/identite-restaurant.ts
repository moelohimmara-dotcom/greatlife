/**
 * Identité du restaurant — une clé JSON, partout (TDR §16).
 *
 * Source canonique : `site_content` clé `restaurant`.
 * Repli de lecture (éditeur seulement, une fois au chargement) :
 * le plat historique `site_config` (`restaurantName`, `phone`, …).
 *
 * Le site public lit l’instantané chrome, jamais ce repli en direct.
 */

import { resolveI18n } from './i18n'

/** Champs d’identité partagés par le Pied et l’écran Coordonnées. */
export const CLES_IDENTITE_CANONIQUES = [
  'name',
  'phone',
  'address',
  'emailContact',
] as const

export type ClefIdentiteCanonique = (typeof CLES_IDENTITE_CANONIQUES)[number]

/**
 * Correspondance plat historique → clé canonique.
 * `restaurantName` (plat) = `name` (restaurant).
 */
export const PLAT_VERS_CANON = {
  restaurantName: 'name',
  phone: 'phone',
  address: 'address',
  emailContact: 'emailContact',
  emailReservation: 'emailReservation',
  hours: 'hours',
  slogan: 'slogan',
} as const

export type PlatIdentite = {
  restaurantName?: string
  phone?: string
  address?: string
  hours?: string
  emailContact?: string
  emailReservation?: string
  slogan?: string
}

function texteVide(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim().length === 0
  if (typeof value === 'object' && !Array.isArray(value)) {
    const o = value as Record<string, unknown>
    const fr = typeof o.fr === 'string' ? o.fr.trim() : ''
    const en = typeof o.en === 'string' ? o.en.trim() : ''
    return fr.length === 0 && en.length === 0
  }
  return true
}

function chaine(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return resolveI18n(value as { fr?: string; en?: string }, 'fr').trim()
  }
  return ''
}

/**
 * A = JSON `restaurant`. B = plat `site_config`.
 * Une clé déjà remplie dans A n’est jamais écrasée par B.
 */
export function completerRestaurantDepuisPlat(
  restaurantRaw: Record<string, unknown> | null | undefined,
  plat: PlatIdentite,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...(restaurantRaw ?? {}) }
  if (texteVide(out.name) && plat.restaurantName?.trim()) out.name = plat.restaurantName.trim()
  if (texteVide(out.phone) && plat.phone?.trim()) out.phone = plat.phone.trim()
  if (texteVide(out.address) && plat.address?.trim()) out.address = plat.address.trim()
  if (texteVide(out.emailContact) && plat.emailContact?.trim()) out.emailContact = plat.emailContact.trim()
  if (texteVide(out.emailReservation) && plat.emailReservation?.trim()) {
    out.emailReservation = plat.emailReservation.trim()
  }
  if (texteVide(out.hours) && plat.hours?.trim()) out.hours = plat.hours.trim()
  if (texteVide(out.slogan) && plat.slogan?.trim()) out.slogan = plat.slogan.trim()
  return out
}

/** Pour pré-remplir l’écran Coordonnées : A d’abord, sinon le plat déjà affiché. */
export function platDepuisRestaurant(
  restaurantRaw: Record<string, unknown> | null | undefined,
  plat: PlatIdentite,
): PlatIdentite {
  const raw = restaurantRaw ?? {}
  const nom = chaine(raw.name)
  const phone = chaine(raw.phone)
  const address = chaine(raw.address)
  const emailContact = chaine(raw.emailContact)
  const emailReservation = chaine(raw.emailReservation)
  const hours = chaine(raw.hours)
  const slogan = chaine(raw.slogan)
  return {
    restaurantName: nom || plat.restaurantName || '',
    phone: phone || plat.phone || '',
    address: address || plat.address || '',
    emailContact: emailContact || plat.emailContact || '',
    emailReservation: emailReservation || plat.emailReservation || '',
    hours: hours || plat.hours || '',
    slogan: slogan || plat.slogan || '',
  }
}

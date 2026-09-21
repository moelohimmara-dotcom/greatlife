/**
 * Greatlife — CMS : accès aux réglages globaux
 * =============================================
 * Les réglages vivent dans `site_content` sous forme de lignes clé/valeur
 * (décision CM-2 / migration 024).
 *
 * ⚠️ La ligne historique `site_config` n'est PAS lue ici : elle reste la
 * propriété de l'ancien modele jusqu'au basculement (décision CM-12).
 *
 * TDR §16 : les coordonnées du restaurant sont une source de vérité unique,
 * consommée par plusieurs sections. Aucune section ne les recopie.
 */

import type { Bilingue, Locale } from '../model/i18n'
import { resolveI18n } from '../model/i18n'
import { asArray, asObject, cmsErr, cmsOk, describeError, requireClient, type CmsResult } from './client'

const TABLE = 'site_content'

export const SETTING_KEYS = {
  restaurant: 'restaurant',
  emailTemplates: 'email_templates',
  /**
   * Réglages visuels du Theme Engine.
   * ⚠️ La ligne n'est PAS créée par le Lot 1 : elle appartient au Lot 4 (TDR §40,
   * « Theme Engine »). `fetchSetting` renvoie donc `null` jusque-là, ce qui est
   * un état normal — ne pas confondre avec une panne.
   * La clé reprend le nom documenté (`docs/04_CONTENT_MODEL.md` §8).
   */
  theme: 'theme',
} as const

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS]

/**
 * Identité canonique — JSON `site_content.restaurant` :
 *   `name` (bilingue), `phone`, `address` (bilingue), `emailContact`
 * Pied (Chrome) et écran Coordonnées patchent CES clés.
 * Repli lecture éditeur : plat `site_config` (`restaurantName`, `phone`,
 * `address`, `emailContact`) si la clé canonique est vide.
 * Public : instantané chrome, pas de lecture live.
 */
export { CLES_IDENTITE_CANONIQUES, completerRestaurantDepuisPlat, platDepuisRestaurant } from '../model/identite-restaurant'

/** Réglages du restaurant — source unique pour header, footer, contact, localisation. */
export interface RestaurantSettings {
  name: Bilingue
  slogan: Bilingue
  address: Bilingue
  hours: Bilingue
  phone: string
  emailContact: string
  emailReservation: string
  currency: string
  social: { facebook: string; instagram: string; whatsapp: string }
}

/** Horaires de retrait proposés à la commande. */
export interface EmailTemplates {
  contactAutoReply: Bilingue
  pickupTimes: string[]
}

export const DEFAULT_RESTAURANT: RestaurantSettings = {
  name: '',
  slogan: '',
  address: '',
  hours: '',
  phone: '',
  emailContact: '',
  emailReservation: '',
  currency: 'FG',
  social: { facebook: '', instagram: '', whatsapp: '' },
}

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplates = {
  contactAutoReply: '',
  pickupTimes: [],
}

/** Lit une clé de réglages. Renvoie `null` si la clé n'existe pas encore. */
export async function fetchSetting(key: SettingKey): Promise<CmsResult<Record<string, unknown> | null>> {
  const client = requireClient()
  if (!client.ok) return client

  try {
    const { data, error } = await client.data
      .from(TABLE)
      .select('key, value')
      .eq('key', key)
      .maybeSingle()

    if (error) return cmsErr(describeError(error))
    return cmsOk(data ? asObject((data as { value: unknown }).value) : null)
  } catch (err) {
    return cmsErr(describeError(err))
  }
}

/** Écrit (crée ou remplace) une clé de réglages. */
export async function saveSetting(
  key: SettingKey,
  value: Record<string, unknown>,
  options: { merge?: boolean } = {},
): Promise<CmsResult<true>> {
  const run = () => ecrireSetting(key, value, options.merge === true)
  if (key === SETTING_KEYS.restaurant) {
    const prochaine = fileRestaurant.then(run, run)
    fileRestaurant = prochaine.then(() => undefined, () => undefined)
    return prochaine
  }
  return run()
}

/** File d’attente : Chrome (900 ms) et Typo (400 ms) ne s’écrasent plus. */
let fileRestaurant: Promise<unknown> = Promise.resolve()

const brouillonsAVider = new Set<() => Promise<void>>()

/** Les panneaux En-tête / Typo s’y enregistrent pour vider leur délai avant Publier. */
export function registerRestaurantDraftFlush(vider: () => Promise<void>): () => void {
  brouillonsAVider.add(vider)
  return () => { brouillonsAVider.delete(vider) }
}

export async function flushRestaurantDrafts(): Promise<void> {
  await Promise.all([...brouillonsAVider].map((vider) => vider()))
}

async function ecrireSetting(
  key: SettingKey,
  value: Record<string, unknown>,
  merge: boolean,
): Promise<CmsResult<true>> {
  const client = requireClient()
  if (!client.ok) return client

  try {
    let payload = { ...value }
    if (merge) {
      const actuel = await fetchSetting(key)
      if (!actuel.ok) return actuel
      payload = { ...(actuel.data ?? {}), ...value }
    }
    if (key === SETTING_KEYS.restaurant) {
      payload = normaliserRestaurantJson(payload)
    }

    const { error } = await client.data
      .from(TABLE)
      .upsert({ key, value: payload, updated_at: new Date().toISOString() }, { onConflict: 'key' })

    if (error) return cmsErr(describeError(error))
    return cmsOk(true)
  } catch (err) {
    return cmsErr(describeError(err))
  }
}

/** Une seule vérité pour le logo : `chromePresentation.header.logoUrl`. */
export function normaliserRestaurantJson(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...raw }
  const logoRacine = typeof out.logoUrl === 'string' ? out.logoUrl.trim() : ''
  delete out.logoUrl
  const pres = asObject(out.chromePresentation)
  const header = asObject(pres.header)
  const logoHeader = typeof header.logoUrl === 'string' ? header.logoUrl.trim() : ''
  if (logoHeader) header.logoUrl = logoHeader
  else if (logoRacine) header.logoUrl = logoRacine
  else delete header.logoUrl
  if (Object.keys(header).length > 0 || Object.keys(pres).length > 0) {
    out.chromePresentation = { ...pres, header }
  }
  return out
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** Normalise les réglages du restaurant, avec valeurs par défaut. */
export function toRestaurantSettings(raw: Record<string, unknown> | null): RestaurantSettings {
  if (!raw) return { ...DEFAULT_RESTAURANT }
  const social = asObject(raw.social)
  return {
    name: (raw.name ?? '') as Bilingue,
    slogan: (raw.slogan ?? '') as Bilingue,
    address: (raw.address ?? '') as Bilingue,
    hours: (raw.hours ?? '') as Bilingue,
    phone: str(raw.phone),
    emailContact: str(raw.emailContact),
    emailReservation: str(raw.emailReservation),
    currency: str(raw.currency) || 'FG',
    social: {
      facebook: str(social.facebook),
      instagram: str(social.instagram),
      whatsapp: str(social.whatsapp),
    },
  }
}

/** Normalise les gabarits d'email, avec valeurs par défaut. */
export function toEmailTemplates(raw: Record<string, unknown> | null): EmailTemplates {
  if (!raw) return { ...DEFAULT_EMAIL_TEMPLATES }
  return {
    contactAutoReply: (raw.contactAutoReply ?? '') as Bilingue,
    pickupTimes: asArray(raw.pickupTimes).filter((t): t is string => typeof t === 'string'),
  }
}

/** Version résolue dans une langue, prête à afficher. */
export interface ResolvedRestaurant {
  name: string
  slogan: string
  address: string
  hours: string
  phone: string
  emailContact: string
  emailReservation: string
  currency: string
  social: { facebook: string; instagram: string; whatsapp: string }
}

/** Résout les réglages du restaurant dans la langue demandée. */
export function resolveRestaurant(
  settings: RestaurantSettings,
  locale: Locale,
): ResolvedRestaurant {
  return {
    name: resolveI18n(settings.name, locale),
    slogan: resolveI18n(settings.slogan, locale),
    address: resolveI18n(settings.address, locale),
    hours: resolveI18n(settings.hours, locale),
    phone: settings.phone,
    emailContact: settings.emailContact,
    emailReservation: settings.emailReservation,
    currency: settings.currency,
    social: settings.social,
  }
}

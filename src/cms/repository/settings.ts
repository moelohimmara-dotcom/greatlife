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
  theme: 'theme_v2',
} as const

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS]

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
): Promise<CmsResult<true>> {
  const client = requireClient()
  if (!client.ok) return client

  try {
    const { error } = await client.data
      .from(TABLE)
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })

    if (error) return cmsErr(describeError(error))
    return cmsOk(true)
  } catch (err) {
    return cmsErr(describeError(err))
  }
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

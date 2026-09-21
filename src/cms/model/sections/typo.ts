/**
 * Typo du site — présentation séparable (TDR §4), comme le Cadre.
 * Stockée dans `site_content.restaurant.typography`.
 * Pas de migration SQL. Absent = polices actuelles (`fontId` / --f-heading).
 */
import type { CSSProperties } from 'react'
import {
  familleParId,
  lotParId,
  lotDepuisFontId,
  type FontPair,
} from '@/config/fonts'

export type TypoMode = 'lot' | 'manuel'
export type TitreGraisse = 'regular' | 'medium' | 'bold'
export type TypoEchelle = 'petit' | 'normal' | 'grand'

export interface TypoReglages {
  mode: TypoMode
  lot: string
  heading: string
  body: string
  headingWeight: TitreGraisse
  scale: TypoEchelle
}

export const TITRE_GRAISSES: readonly { id: TitreGraisse; label: string; css: number }[] = [
  { id: 'regular', label: 'Normale', css: 400 },
  { id: 'medium', label: 'Moyenne', css: 500 },
  { id: 'bold', label: 'Grasse', css: 700 },
]

export const TYPO_ECHELLES: readonly { id: TypoEchelle; label: string; css: number }[] = [
  { id: 'petit', label: 'Petit', css: 0.92 },
  { id: 'normal', label: 'Normal', css: 1 },
  { id: 'grand', label: 'Grand', css: 1.12 },
]

const MODES: readonly TypoMode[] = ['lot', 'manuel']
const GRAISSES = new Set(TITRE_GRAISSES.map((g) => g.id))
const ECHELLES = new Set(TYPO_ECHELLES.map((e) => e.id))

export const TYPO_DEFAUT: TypoReglages = {
  mode: 'lot',
  lot: 'accueillant',
  heading: 'fraunces',
  body: 'dmSans',
  headingWeight: 'bold',
  scale: 'normal',
}

export function typoDepuisFontId(fontId: string | undefined): TypoReglages {
  const lot = lotDepuisFontId(fontId)
  const paire = lotParId(lot)
  return {
    ...TYPO_DEFAUT,
    lot,
    heading: familleDepuisStack(paire.heading, 'fraunces'),
    body: familleDepuisStack(paire.body, 'dmSans'),
  }
}

function familleDepuisStack(stack: string, repli: string): string {
  const nom = stack.split(',')[0]?.replace(/['"]/g, '').trim()
  const table: Record<string, string> = {
    Fraunces: 'fraunces',
    'Playfair Display': 'playfairDisplay',
    'Plus Jakarta Sans': 'jakartaSans',
    'Cormorant Garamond': 'cormorant',
    Lora: 'lora',
    Inter: 'inter',
    'DM Sans': 'dmSans',
    Karla: 'karla',
  }
  return (nom && table[nom]) || repli
}

export function typoDepuisReglages(raw: unknown): TypoReglages | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const racine = (raw as Record<string, unknown>).typography
  if (!racine || typeof racine !== 'object' || Array.isArray(racine)) return null
  const o = racine as Record<string, unknown>
  const mode: TypoMode = typeof o.mode === 'string' && MODES.includes(o.mode as TypoMode)
    ? (o.mode as TypoMode)
    : 'lot'
  const lot = typeof o.lot === 'string' && o.lot ? o.lot : 'accueillant'
  const heading = typeof o.heading === 'string' && familleParId(o.heading) ? o.heading : 'fraunces'
  const body = typeof o.body === 'string' && familleParId(o.body) ? o.body : 'dmSans'
  const headingWeight: TitreGraisse = typeof o.headingWeight === 'string' && GRAISSES.has(o.headingWeight as TitreGraisse)
    ? (o.headingWeight as TitreGraisse)
    : 'bold'
  const scale: TypoEchelle = typeof o.scale === 'string' && ECHELLES.has(o.scale as TypoEchelle)
    ? (o.scale as TypoEchelle)
    : 'normal'
  return { mode, lot, heading, body, headingWeight, scale }
}

export function typoVersReglages(t: TypoReglages): Record<string, unknown> {
  return {
    mode: t.mode,
    lot: t.lot,
    heading: t.heading,
    body: t.body,
    headingWeight: t.headingWeight,
    scale: t.scale,
  }
}

export interface TypoResolue {
  pair: FontPair
  headingStack: string
  bodyStack: string
  headingWeight: number
  scale: number
}

export function resoudreTypo(t: TypoReglages): TypoResolue {
  const lot = lotParId(t.lot)
  const headingStack = t.mode === 'manuel'
    ? (familleParId(t.heading)?.stack ?? lot.heading)
    : lot.heading
  const bodyStack = t.mode === 'manuel'
    ? (familleParId(t.body)?.stack ?? lot.body)
    : lot.body
  const headingWeight = TITRE_GRAISSES.find((g) => g.id === t.headingWeight)?.css ?? 700
  const scale = TYPO_ECHELLES.find((e) => e.id === t.scale)?.css ?? 1
  return {
    pair: { ...lot, heading: headingStack, body: bodyStack },
    headingStack,
    bodyStack,
    headingWeight,
    scale,
  }
}

/** Variables CSS posées sur le wrapper public / aperçu. Alias --f-* = non-régression. */
export function styleTypo(t: TypoReglages | null | undefined): CSSProperties {
  if (!t) return {}
  const r = resoudreTypo(t)
  return {
    fontFamily: r.bodyStack,
    ['--font-heading' as string]: r.headingStack,
    ['--font-body' as string]: r.bodyStack,
    ['--f-heading' as string]: r.headingStack,
    ['--f-body' as string]: r.bodyStack,
    ['--font-heading-weight' as string]: String(r.headingWeight),
    ['--font-scale' as string]: String(r.scale),
  } as CSSProperties
}

/**
 * Lots de typo du restaurant — paires Titres + Textes.
 * Les libellés exposés au restaurateur sont en français (jamais un nom technique).
 *
 * Les clés historiques `fraunces` / `playfair` / `jakarta` restent lisibles
 * (`fontId` déjà enregistré) : elles pointent vers Accueillant / Classique / Moderne.
 */

export interface FontPair {
  id: string
  label: string
  heading: string
  body: string
  /** Phrase courte pour les cartes Apparence. */
  sample?: string
}

export interface FontFamilyChoice {
  id: string
  /** Libellé restaurateur. */
  label: string
  stack: string
  google: string
  titres: boolean
  textes: boolean
}

export const FONT_FAMILIES: readonly FontFamilyChoice[] = [
  { id: 'fraunces', label: 'Chaleureuse', stack: "'Fraunces', Georgia, serif", google: 'Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700', titres: true, textes: false },
  { id: 'playfairDisplay', label: 'Classique', stack: "'Playfair Display', Georgia, serif", google: 'Playfair+Display:wght@400;500;600;700', titres: true, textes: false },
  { id: 'jakartaSans', label: 'Moderne', stack: "'Plus Jakarta Sans', sans-serif", google: 'Plus+Jakarta+Sans:wght@400;500;600;700', titres: true, textes: true },
  { id: 'cormorant', label: 'Prestige', stack: "'Cormorant Garamond', Georgia, serif", google: 'Cormorant+Garamond:wght@400;500;600;700', titres: true, textes: false },
  { id: 'lora', label: 'Journal', stack: "'Lora', Georgia, serif", google: 'Lora:wght@400;500;600;700', titres: true, textes: true },
  { id: 'inter', label: 'Nette', stack: "'Inter', sans-serif", google: 'Inter:wght@400;500;600;700', titres: true, textes: true },
  { id: 'dmSans', label: 'Souple', stack: "'DM Sans', sans-serif", google: 'DM+Sans:wght@400;500;600;700', titres: false, textes: true },
  { id: 'karla', label: 'Lisible', stack: "'Karla', sans-serif", google: 'Karla:wght@400;500;600;700', titres: false, textes: true },
]

function stackFamille(id: string, repli: string): string {
  return FONT_FAMILIES.find((f) => f.id === id)?.stack ?? repli
}

const FRAUNCES = stackFamille('fraunces', "'Fraunces', Georgia, serif")
const PLAYFAIR = stackFamille('playfairDisplay', "'Playfair Display', Georgia, serif")
const JAKARTA = stackFamille('jakartaSans', "'Plus Jakarta Sans', sans-serif")
const CORMORANT = stackFamille('cormorant', "'Cormorant Garamond', Georgia, serif")
const LORA = stackFamille('lora', "'Lora', Georgia, serif")
const INTER = stackFamille('inter', "'Inter', sans-serif")
const DM = stackFamille('dmSans', "'DM Sans', sans-serif")
const KARLA = stackFamille('karla', "'Karla', sans-serif")

/**
 * Lots nommés (cartes Apparence). Plafond volontaire : pas un catalogue de 200 polices.
 * Pairings : Classic Elegant / Restaurant Menu (ui-ux-pro-max) + familles déjà chargées.
 */
export const TYPO_LOTS: readonly FontPair[] = [
  { id: 'accueillant', label: 'Accueillant', heading: FRAUNCES, body: DM, sample: 'Le fast-food sans complexe' },
  { id: 'classique', label: 'Classique', heading: PLAYFAIR, body: INTER, sample: 'Le fast-food sans complexe' },
  { id: 'moderne', label: 'Moderne', heading: JAKARTA, body: DM, sample: 'Le fast-food sans complexe' },
  { id: 'prestige', label: 'Prestige', heading: CORMORANT, body: INTER, sample: 'Le fast-food sans complexe' },
  { id: 'journal', label: 'Journal', heading: LORA, body: INTER, sample: 'Le fast-food sans complexe' },
  { id: 'sobre', label: 'Sobre', heading: INTER, body: DM, sample: 'Le fast-food sans complexe' },
  { id: 'menu', label: 'Menu', heading: PLAYFAIR, body: KARLA, sample: 'Le fast-food sans complexe' },
]

const LOT_PAR_ID: Record<string, FontPair> = Object.fromEntries(TYPO_LOTS.map((l) => [l.id, l]))

export const FONTS: Record<string, FontPair> = {
  fraunces: { id: 'fraunces', label: 'Accueillant', heading: FRAUNCES, body: DM, sample: 'Le fast-food sans complexe' },
  playfair: { id: 'playfair', label: 'Classique', heading: PLAYFAIR, body: INTER, sample: 'Le fast-food sans complexe' },
  jakarta: { id: 'jakarta', label: 'Moderne', heading: JAKARTA, body: DM, sample: 'Le fast-food sans complexe' },
  accueillant: LOT_PAR_ID.accueillant,
  classique: LOT_PAR_ID.classique,
  moderne: LOT_PAR_ID.moderne,
  prestige: LOT_PAR_ID.prestige,
  journal: LOT_PAR_ID.journal,
  sobre: LOT_PAR_ID.sobre,
  menu: LOT_PAR_ID.menu,
}

/** `fontId` historique → lot nommé. */
export function lotDepuisFontId(fontId: string | undefined): string {
  if (!fontId) return 'accueillant'
  if (fontId === 'fraunces') return 'accueillant'
  if (fontId === 'playfair') return 'classique'
  if (fontId === 'jakarta') return 'moderne'
  if (LOT_PAR_ID[fontId]) return fontId
  return 'accueillant'
}

export function lotParId(id: string | undefined): FontPair {
  return LOT_PAR_ID[id ?? ''] ?? LOT_PAR_ID.accueillant
}

export function familleParId(id: string | undefined): FontFamilyChoice | undefined {
  if (!id) return undefined
  return FONT_FAMILIES.find((f) => f.id === id)
}

export function policesTitres(): readonly FontFamilyChoice[] {
  return FONT_FAMILIES.filter((f) => f.titres)
}

export function policesTextes(): readonly FontFamilyChoice[] {
  return FONT_FAMILIES.filter((f) => f.textes)
}

export function googleFontsHref(): string {
  const families = FONT_FAMILIES.map((f) => `family=${f.google}`).join('&')
  return `https://fonts.googleapis.com/css2?${families}&display=swap`
}

/** Charge (ou met à jour) la feuille des polices — même id que le chargeur historique. */
export function assurerPolicesChargees(): void {
  if (typeof document === 'undefined') return
  const href = googleFontsHref()
  let link = document.getElementById('greatlife-fonts') as HTMLLinkElement | null
  if (!link) {
    link = document.createElement('link')
    link.id = 'greatlife-fonts'
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }
  if (!link.href.includes('Cormorant') || !link.href.includes('600')) {
    link.href = href
  }
}

/**
 * HTML borné — pas un clone Google Docs.
 *
 * Profil `inline` (titres, R10 / R12) : strong | em | a[href]
 * Profil `rich` (accroche, corps, pied) :
 *   strong | em | u | a[href] | ul | ol | li | p | br | blockquote | span | mark
 *   span : classe cms-align-* / cms-size-large, data-cms-fg, style color:#RGB|#RRGGBB
 *   mark : data-cms-hl + background-color hex seulement
 *          (pas de style libre, pas de javascript:, pas de script).
 *   <font color> (execCommand) est réécrit en span data-cms-fg.
 *
 * R13 — coller depuis Word/Docs : on sanitise, on ne conserve pas le reste.
 */

import { sanitiserHex } from '../model/sections/couleur'

export type MarkupProfile = 'inline' | 'rich'

const INLINE_TAGS = new Set(['strong', 'em', 'a'])
const RICH_TAGS = new Set(['strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'p', 'br', 'blockquote', 'span', 'mark'])
const VOID_TAGS = new Set(['br'])
const ALIGN_CLASSES = new Set(['cms-align-left', 'cms-align-center'])
const SIZE_CLASS = 'cms-size-large'

export function hrefAutorise(href: string): boolean {
  const h = href.trim()
  if (!h || h.length > 500) return false
  if (h.toLowerCase().includes('javascript:')) return false
  if (h.startsWith('#')) return /^#[A-Za-z0-9._~-]*$/.test(h)
  if (h.startsWith('/') && !h.startsWith('//')) {
    return !/[\s<>"]/.test(h)
  }
  try {
    const u = new URL(h)
    return u.protocol === 'http:' || u.protocol === 'https:' || u.protocol === 'mailto:' || u.protocol === 'tel:'
  } catch {
    return false
  }
}

export function contientBalisage(valeur: string): boolean {
  return /<\s*(strong|em|u|a|b|i|ul|ol|li|p|br|blockquote|span|mark|font)\b/i.test(valeur)
}

function extraireDataHex(attrs: string, nom: string): string | null {
  const re = new RegExp(`\\b${nom}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i')
  const m = attrs.match(re)
  const brut = (m?.[1] ?? m?.[2] ?? m?.[3] ?? '').trim()
  return brut ? sanitiserHex(brut) : null
}

function extraireHexDepuis(fragment: string): string | null {
  const hex = fragment.match(/#[0-9a-fA-F]{3,8}\b/)
  if (hex) return sanitiserHex(hex[0])
  const rgb = fragment.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i)
  if (rgb) {
    const toHex = (v: string) => Math.max(0, Math.min(255, Number(v))).toString(16).padStart(2, '0')
    return sanitiserHex(`#${toHex(rgb[1])}${toHex(rgb[2])}${toHex(rgb[3])}`)
  }
  return null
}

function echapperTexte(texte: string): string {
  return texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function extraireHref(attrs: string): string | null {
  const m = attrs.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i)
  if (!m) return null
  const href = (m[1] ?? m[2] ?? m[3] ?? '').trim()
  return hrefAutorise(href) ? href : null
}

function extraireClasses(attrs: string): string[] {
  const m = attrs.match(/\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')/i)
  const raw = m?.[1] ?? m?.[2] ?? ''
  return raw.split(/\s+/).filter(Boolean)
}

function extraireAlign(attrs: string): 'cms-align-left' | 'cms-align-center' | null {
  for (const c of extraireClasses(attrs)) {
    if (c === 'cms-align-center' || c === 'cms-align-left') return c
  }
  const alignAttr = attrs.match(/\balign\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i)
  const fromAttr = (alignAttr?.[1] ?? alignAttr?.[2] ?? alignAttr?.[3] ?? '').toLowerCase()
  if (fromAttr === 'center') return 'cms-align-center'
  if (fromAttr === 'left') return 'cms-align-left'
  const style = extraireStyleAlign(attrs)
  return style
}

function extraireStyleAlign(attrs: string): 'cms-align-left' | 'cms-align-center' | null {
  const m = attrs.match(/text-align\s*:\s*(left|center)\b/i)
  if (!m) return null
  return m[1].toLowerCase() === 'center' ? 'cms-align-center' : 'cms-align-left'
}

function extraireTaille(attrs: string): boolean {
  if (extraireClasses(attrs).includes(SIZE_CLASS)) return true
  const size = attrs.match(/\bsize\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i)
  const n = Number(size?.[1] ?? size?.[2] ?? size?.[3] ?? '')
  if (Number.isFinite(n) && n >= 4) return true
  const px = attrs.match(/font-size\s*:\s*(\d+(?:\.\d+)?)px/i)
  if (px && Number(px[1]) >= 18) return true
  return false
}

function extraireCouleur(attrs: string): string | null {
  const depuisData = extraireDataHex(attrs, 'data-cms-fg')
  if (depuisData) return depuisData
  const attrColor = attrs.match(/(?:^|\s)color\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i)
  const attrVal = (attrColor?.[1] ?? attrColor?.[2] ?? attrColor?.[3] ?? '').trim()
  if (attrVal) {
    const hex = sanitiserHex(attrVal)
    if (hex) return hex
  }
  const styleSeul = attrs.match(/style\s*=\s*(?:"([^"]*)"|'([^']*)')/i)
  const bloc = styleSeul?.[1] ?? styleSeul?.[2] ?? ''
  const dansStyle = bloc.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i)
  if (dansStyle) return extraireHexDepuis(dansStyle[1])
  return null
}

function extraireFond(attrs: string): string | null {
  const depuisData = extraireDataHex(attrs, 'data-cms-hl')
  if (depuisData) return depuisData
  const fond = attrs.match(/background(?:-color)?\s*:\s*([^;]+)/i)
  if (!fond) return null
  const valeur = fond[1]
  if (/url\s*\(|expression|javascript/i.test(valeur)) return null
  return extraireHexDepuis(valeur)
}

function ouvrirSpan(attrs: string): string | null {
  const classes: string[] = []
  const align = extraireAlign(attrs)
  if (align && ALIGN_CLASSES.has(align)) classes.push(align)
  if (extraireTaille(attrs)) classes.push(SIZE_CLASS)
  const color = extraireCouleur(attrs)
  const hl = extraireFond(attrs)
  const parts: string[] = []
  if (classes.length > 0) parts.push(`class="${classes.join(' ')}"`)
  if (color) parts.push(`data-cms-fg="${color}"`)
  if (hl) parts.push(`data-cms-hl="${hl}"`)
  const styles: string[] = []
  if (color) styles.push(`color:${color}`)
  if (hl) styles.push(`background-color:${hl}`)
  if (styles.length > 0) parts.push(`style="${styles.join(';')}"`)
  if (parts.length === 0) return null
  return `<span ${parts.join(' ')}>`
}

function ouvrirMark(attrs: string): string {
  const hl = extraireFond(attrs) ?? extraireDataHex(attrs, 'data-cms-hl')
  if (!hl) return '<mark>'
  return `<mark data-cms-hl="${hl}" style="background-color:${hl}">`
}

function ouvrirParagraphe(attrs: string): string {
  const align = extraireAlign(attrs)
  return align ? `<p class="${align}">` : '<p>'
}

function balisesPour(profile: MarkupProfile): Set<string> {
  return profile === 'rich' ? RICH_TAGS : INLINE_TAGS
}

function preparer(input: string): string {
  return input
    .replace(/<\s*b(\s|>)/gi, '<strong$1')
    .replace(/<\s*\/\s*b\s*>/gi, '</strong>')
    .replace(/<\s*i(\s|>)/gi, '<em$1')
    .replace(/<\s*\/\s*i\s*>/gi, '</em>')
    .replace(/<\s*div\b/gi, '<p')
    .replace(/<\s*\/\s*div\s*>/gi, '</p>')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\s*script\b[\s\S]*?<\/\s*script\s*>/gi, '')
    .replace(/<\s*style\b[\s\S]*?<\/\s*style\s*>/gi, '')
}

/**
 * Ne laisse passer que les balises du profil.
 * Le reste est affiché comme du texte (balises retirées, contenu conservé).
 */
export function sanitizeInlineHtml(input: string, profile: MarkupProfile = 'inline'): string {
  if (!input) return ''
  const autorisees = balisesPour(profile)
  const source = preparer(input)
  const out: string[] = []
  const pile: string[] = []
  const re = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>|([^<]+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(source)) !== null) {
    if (m[3] !== undefined) {
      out.push(echapperTexte(m[3]))
      continue
    }
    const nom = m[1].toLowerCase()
    const fermante = m[0].startsWith('</')
    const autoClose = m[0].endsWith('/>') || VOID_TAGS.has(nom)

    if (nom === 'span' && profile === 'rich' && !fermante) {
      const ouvert = ouvrirSpan(m[2] ?? '')
      if (!ouvert) continue
      pile.push('span')
      out.push(ouvert)
      continue
    }

    if (nom === 'mark' && profile === 'rich' && !fermante) {
      pile.push('mark')
      out.push(ouvrirMark(m[2] ?? ''))
      continue
    }

    if (nom === 'font' && profile === 'rich' && !fermante) {
      const ouvert = ouvrirSpan(m[2] ?? '')
      if (!ouvert) continue
      pile.push('span')
      out.push(ouvert)
      continue
    }

    if (nom === 'font' && profile === 'rich' && fermante) {
      const idx = pile.lastIndexOf('span')
      if (idx < 0) continue
      while (pile.length > idx) {
        const ouvert = pile.pop()
        if (ouvert && !VOID_TAGS.has(ouvert)) out.push(`</${ouvert}>`)
      }
      continue
    }

    if (!autorisees.has(nom)) continue

    if (fermante) {
      const idx = pile.lastIndexOf(nom)
      if (idx < 0) continue
      while (pile.length > idx) {
        const ouvert = pile.pop()
        if (ouvert && !VOID_TAGS.has(ouvert)) out.push(`</${ouvert}>`)
      }
      continue
    }

    if (nom === 'a') {
      const href = extraireHref(m[2] ?? '')
      if (!href) continue
      pile.push('a')
      out.push(`<a href="${echapperTexte(href)}">`)
      continue
    }

    if (nom === 'p' && profile === 'rich') {
      pile.push('p')
      out.push(ouvrirParagraphe(m[2] ?? ''))
      continue
    }

    if (VOID_TAGS.has(nom) || autoClose) {
      out.push(`<${nom}>`)
      continue
    }

    pile.push(nom)
    out.push(`<${nom}>`)
  }
  while (pile.length > 0) {
    const ouvert = pile.pop()
    if (ouvert && !VOID_TAGS.has(ouvert)) out.push(`</${ouvert}>`)
  }
  return out.join('')
}

export type InlineCommand = 'strong' | 'em' | 'u' | 'a'

export function envelopperSelection(
  valeur: string,
  debut: number,
  fin: number,
  commande: InlineCommand,
  href?: string,
  profile: MarkupProfile = 'inline',
): string {
  const a = Math.max(0, Math.min(debut, fin, valeur.length))
  const b = Math.max(0, Math.min(Math.max(debut, fin), valeur.length))
  const milieu = valeur.slice(a, b)
  if (!milieu) return valeur
  let morceau = ''
  if (commande === 'a') {
    const cible = href && hrefAutorise(href) ? href : '#'
    morceau = `<a href="${cible}">${milieu}</a>`
  } else {
    morceau = `<${commande}>${milieu}</${commande}>`
  }
  return sanitizeInlineHtml(valeur.slice(0, a) + morceau + valeur.slice(b), profile)
}

/** R13 — HTML collé (Word/Docs) ou texte brut. */
export function collerExterne(
  html: string | null | undefined,
  plain: string,
  profile: MarkupProfile,
): string {
  if (html && html.trim()) return sanitizeInlineHtml(html, profile)
  if (profile === 'rich') {
    return sanitizeInlineHtml(plain.replace(/\r\n|\r|\n/g, '<br>'), 'rich')
  }
  return sanitizeInlineHtml(plain, 'inline')
}

export function retirerFormat(html: string): string {
  const sans = sanitizeInlineHtml(html, 'rich')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
  return sans.replace(/\n{3,}/g, '\n\n').trim()
}

export function envelopperListe(html: string, kind: 'ul' | 'ol'): string {
  const propre = sanitizeInlineHtml(html, 'rich')
  const lignes = propre
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lignes.length === 0) return propre
  const items = lignes.map((l) => `<li>${l}</li>`).join('')
  return sanitizeInlineHtml(`<${kind}>${items}</${kind}>`, 'rich')
}

export function envelopperAlignement(html: string, align: 'left' | 'center'): string {
  const classe = align === 'center' ? 'cms-align-center' : 'cms-align-left'
  const propre = sanitizeInlineHtml(html, 'rich')
  if (!propre.trim()) return propre
  if (/<p\b/i.test(propre)) {
    return sanitizeInlineHtml(
      propre.replace(/<p\b([^>]*)>/gi, `<p class="${classe}">`),
      'rich',
    )
  }
  return sanitizeInlineHtml(`<p class="${classe}">${propre}</p>`, 'rich')
}

export function envelopperCouleur(html: string, hex: string): string {
  const couleur = sanitiserHex(hex)
  if (!couleur) return sanitizeInlineHtml(html, 'rich')
  const propre = sanitizeInlineHtml(html, 'rich')
  if (!propre.trim()) return propre
  return sanitizeInlineHtml(
    `<span data-cms-fg="${couleur}" style="color:${couleur}">${propre}</span>`,
    'rich',
  )
}

export function envelopperSurbrillance(html: string, hex: string): string {
  const fond = sanitiserHex(hex)
  if (!fond) return sanitizeInlineHtml(html, 'rich')
  const propre = sanitizeInlineHtml(html, 'rich')
  if (!propre.trim()) return propre
  return sanitizeInlineHtml(
    `<mark data-cms-hl="${fond}" style="background-color:${fond}">${propre}</mark>`,
    'rich',
  )
}

export function envelopperCitation(html: string): string {
  const propre = sanitizeInlineHtml(html, 'rich')
  if (!propre.trim()) return propre
  return sanitizeInlineHtml(`<blockquote>${propre}</blockquote>`, 'rich')
}

export function envelopperTaille(html: string, taille: 'normal' | 'large'): string {
  const propre = sanitizeInlineHtml(html, 'rich')
  if (taille === 'normal') {
    return sanitizeInlineHtml(
      propre.replace(/\sclass="([^"]*)"/gi, (_all, classes: string) => {
        const rest = classes.split(/\s+/).filter((c) => c && c !== SIZE_CLASS)
        return rest.length ? ` class="${rest.join(' ')}"` : ''
      }),
      'rich',
    )
  }
  return sanitizeInlineHtml(`<span class="${SIZE_CLASS}">${propre}</span>`, 'rich')
}

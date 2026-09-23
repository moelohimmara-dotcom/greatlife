/**
 * Greatlife — CMS : colonne Aperçu
 * ==================================
 * Rendu temps réel dans une iframe, isolée des styles de la console.
 *
 * Bureau / Téléphone : l'iframe a la LARGEUR RÉELLE de l'appareil
 * (1200 px / 390 px), puis on réduit à l'échelle pour tenir dans la colonne.
 * Les mises en page (grille, écran partagé) réagissent donc comme sur le
 * site public. Le chrome (bordure, rayon) est sur le cadre, pas sur l'iframe,
 * pour que le zoom ne casse pas le halo.
 *
 * À chaque changement de mise en page, on ramène le défilement en haut :
 * c'est là que le choix se voit (bannière). Rester sur « Notre histoire »
 * donnait l'impression que rien ne bougeait.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { PageSection } from '@/cms/model/section'
import type { Locale } from '@/cms/model/i18n'
import { getSectionDefinition } from '@/cms/model/sections/schemas'
import type { ResolvedRestaurant } from '@/cms/repository/settings'
import { PageRenderer } from '@/cms/renderer/PageRenderer'
import type { PageLayout } from '@/cms/model/page-layout'
import type { ChromePresentation } from '@/cms/model/sections/chrome-presentation'
import type { LienChrome } from '@/cms/model/sections/site-chrome'
import { styleTypo, type TypoReglages } from '@/cms/model/sections/typo'
import { googleFontsHref, assurerPolicesChargees } from '@/config/fonts'
import { CartProvider } from '@/contexts/CartContext'
import { Footer } from '@/sections/Footer'
import { PublicNav } from '@/components/nav/PublicNav'
import { useSite } from '@/contexts/SiteContext'
import { Icon } from '@/lib/icons'
import { Bouton } from './chrome'
import { echelleCadreApercu, hauteurVerreApercu } from './preview-geometry'
import { miseEnPageSurBanniere } from '@/cms/model/page-layout'
import {
  caretDepuisPoint,
  insertNode,
  offsetCaret,
  poserCaret,
  slotContientWidget,
  type CibleApercu,
} from './inplace-dom'
import { collerExterne, sanitizeInlineHtml } from '@/cms/renderer/inline-html'

const STYLE_CIBLE_CMS = `
  [data-cms-id] { cursor: pointer; }
  [data-cms-id].is-cms-hover {
    outline: 1px solid color-mix(in srgb, var(--c-primary, #2D5A27) 55%, transparent);
    outline-offset: -1px;
  }
  [data-cms-id].is-cms-picked {
    box-shadow: inset 3px 0 0 var(--c-primary, #2D5A27);
  }
  /* Sélection Structure→Aperçu : pas de ring hover en plus du trait de sélection. */
  [data-cms-id].is-cms-picked.is-cms-hover {
    outline: none;
  }
  [data-cms-slot] { cursor: pointer; }
  [data-cms-slot].is-cms-hover {
    outline: 1px solid color-mix(in srgb, var(--c-primary, #2D5A27) 70%, transparent);
    outline-offset: -1px;
    border-radius: 4px;
  }
  [data-cms-slot].is-cms-slot-picked {
    box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--c-primary, #2D5A27) 40%, transparent);
    background: color-mix(in srgb, var(--c-primary, #2D5A27) 10%, transparent);
    border-radius: 4px;
    outline: none;
  }
  [data-cms-slot].is-cms-grouped {
    outline: 1px dashed color-mix(in srgb, var(--c-primary, #2D5A27) 45%, transparent);
    outline-offset: 2px;
    border-radius: 4px;
  }
  [data-cms-slot][contenteditable="true"] {
    cursor: text !important;
    outline: 2px solid color-mix(in srgb, var(--c-primary, #2D5A27) 55%, transparent);
    outline-offset: 2px;
  }
`

const LIBELLES_CHROME: Record<string, string> = {
  brand: 'Marque',
  nav: 'Menu',
  contact: 'Contact',
  announce: 'Annonce',
}

type CibleCms = { wrap: HTMLElement; slotEl: HTMLElement | null }

function estHtml(win: Window, noeud: Element): noeud is HTMLElement {
  const Ctor = (win as unknown as { HTMLElement: typeof HTMLElement }).HTMLElement
  return typeof Ctor === 'function' ? noeud instanceof Ctor : noeud instanceof HTMLElement
}

function cibleDepuisPoint(
  doc: Document,
  win: Window,
  x: number,
  y: number,
  commandeChrome: boolean,
): CibleCms | null {
  const pile = doc.elementsFromPoint(x, y)
  let slotEl: HTMLElement | null = null
  let wrap: HTMLElement | null = null
  for (const noeud of pile) {
    if (!estHtml(win, noeud)) continue
    const slotIci = noeud.closest('[data-cms-slot]') as HTMLElement | null
    const wrapIci = (slotIci ?? noeud).closest('[data-cms-id]') as HTMLElement | null
    const idIci = wrapIci?.getAttribute('data-cms-id')
    if (!idIci) continue
    const chrome = idIci === 'cms-header' || idIci === 'cms-footer'
    if (chrome && !commandeChrome) continue
    wrap = wrapIci
    slotEl = slotIci
    break
  }
  return wrap ? { wrap, slotEl } : null
}

function libelleCible(wrap: HTMLElement, slotEl: HTMLElement | null): string {
  const slot = slotEl?.getAttribute('data-cms-slot')
  if (slot) {
    const type = wrap.getAttribute('data-cms-section')
    const champ = type ? getSectionDefinition(type)?.fields.find((f) => f.name === slot) : undefined
    return champ?.label ?? LIBELLES_CHROME[slot] ?? 'Texte'
  }
  const type = wrap.getAttribute('data-cms-section')
  const def = type ? getSectionDefinition(type) : undefined
  if (def?.label) return def.label
  const id = wrap.getAttribute('data-cms-id')
  if (id === 'cms-header') return 'En-tête'
  if (id === 'cms-footer') return 'Pied de page'
  return 'Bloc'
}

function saisieEnCours(cible: EventTarget | null): boolean {
  if (!(cible instanceof HTMLElement)) return false
  const tag = cible.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (cible.isContentEditable) return true
  return Boolean(cible.closest('input, textarea, select, [contenteditable="true"]'))
}

function raccourciModificateur(e: KeyboardEvent): boolean {
  return e.metaKey || e.ctrlKey
}

type CadreApercu = 'bureau' | 'telephone'

const LARGEUR_CADRE: Record<CadreApercu, number> = {
  bureau: 1200,
  telephone: 390,
}

/** Épaisseur du chrome autour du verre — hors iframe, donc hors isomorphie. */
const BEZEL_CADRE: Record<CadreApercu, number> = {
  bureau: 1,
  telephone: 8,
}

const RAYON_CADRE: Record<CadreApercu, number> = {
  bureau: 8,
  telephone: 20,
}

interface PreviewPaneProps {
  sections: PageSection[]
  locale?: Locale
  restaurant?: ResolvedRestaurant
  layout?: PageLayout
  /** État de publication affiché sur la scène (kit PreviewFrame). */
  publicationState?: 'draft' | 'live' | 'outdated'
  selectedSectionId?: string | null
  selectedSlots?: string[]
  groupedSlots?: string[]
  groupMode?: boolean
  onPickSection?: (id: string, detail?: { slot: string | null; shift: boolean; toggle?: boolean }) => void
  onClearSlots?: () => void
  onExitGroupMode?: () => void
  onSelectAllSlots?: (sectionId: string, slots: string[]) => void
  onGroupShortcut?: () => void
  onUngroupShortcut?: () => void
  onSlotHtml?: (sectionId: string, slot: string, html: string) => void
  peutEditerSlot?: (sectionId: string, slot: string) => boolean
  profilSlot?: (sectionId: string, slot: string) => 'inline' | 'rich' | 'plain' | null
  onCibleApercu?: (cible: CibleApercu | null) => void
  apercuElargi?: boolean
  onApercuElargiChange?: (elargi: boolean) => void
  chromeTick?: number
  presentation?: ChromePresentation
  liensEntete?: LienChrome[]
  liensPied?: LienChrome[]
  typo?: TypoReglages | null
}

const RESTAURANT_ABSENT: ResolvedRestaurant = {
  name: 'Greatlife',
  address: '',
  hours: '',
  phone: '',
  emailContact: '',
  emailReservation: '',
  slogan: '',
  currency: 'FG',
  social: { facebook: '', whatsapp: '', instagram: '' },
  pickupTimes: [],
}

function PreviewShell({ children, typo }: { children: ReactNode; typo?: TypoReglages | null }) {
  const { rootStyle } = useSite()
  return <div style={{ ...rootStyle, ...styleTypo(typo) }} data-cms-typo="">{children}</div>
}

function remplirIframe(iframe: HTMLIFrameElement, locale: string): HTMLDivElement | null {
  const doc = iframe.contentDocument
  if (!doc) return null

  const feuilles = [...document.querySelectorAll('link[rel="stylesheet"]')]
    .map((n) => (n as HTMLLinkElement).href)
    .filter(Boolean)
  assurerPolicesChargees()
  const polices = googleFontsHref()

  doc.open()
  doc.write(`<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${feuilles.map((href) => `<link rel="stylesheet" href="${href}">`).join('\n  ')}
  ${polices ? `<link rel="stylesheet" href="${polices}">` : ''}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      background: var(--c-cream, #F5EFE6);
      min-height: 100%;
    }
    html { overflow-y: auto; scroll-behavior: auto !important; }
    ${STYLE_CIBLE_CMS}
  </style>
</head>
<body>
  <div id="preview-root"></div>
</body>
</html>`)
  doc.close()
  return doc.getElementById('preview-root') as HTMLDivElement | null
}

export function PreviewPane({
  sections,
  locale = 'fr',
  restaurant,
  layout,
  publicationState = 'draft',
  selectedSectionId = null,
  selectedSlots = [],
  groupedSlots = [],
  groupMode = false,
  onPickSection,
  onClearSlots,
  onExitGroupMode,
  onSelectAllSlots,
  onGroupShortcut,
  onUngroupShortcut,
  onSlotHtml,
  peutEditerSlot,
  profilSlot,
  onCibleApercu,
  apercuElargi = false,
  onApercuElargiChange,
  chromeTick = 0,
  presentation,
  liensEntete,
  liensPied,
  typo = null,
}: PreviewPaneProps) {
  const { theme: t } = useSite()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const sceneRef = useRef<HTMLDivElement>(null)
  const editionRef = useRef<{
    id: string
    slot: string
    el: HTMLElement
    profile: 'inline' | 'rich' | 'plain'
    caret: number
  } | null>(null)
  const clicRef = useRef<{ x: number; y: number } | null>(null)
  const onSlotHtmlRef = useRef(onSlotHtml)
  onSlotHtmlRef.current = onSlotHtml
  const onCibleApercuRef = useRef(onCibleApercu)
  onCibleApercuRef.current = onCibleApercu
  const [ready, setReady] = useState(0)
  const [cadre, setCadre] = useState<CadreApercu>('bureau')
  const [scene, setScene] = useState({ w: 0, h: 0 })
  const miseEnPage = layout ?? 'single_column'
  const scenePrete = scene.w > 0 && scene.h > 0

  useEffect(() => {
    if (!scenePrete) return
    const iframe = iframeRef.current
    if (!iframe) return
    const root = remplirIframe(iframe, locale)
    if (root) {
      containerRef.current = root
      setReady((n) => n + 1)
    }
  }, [locale, scenePrete])

  useEffect(() => {
    const el = sceneRef.current
    if (!el) return
    const mesurer = () => setScene({ w: el.clientWidth, h: el.clientHeight })
    mesurer()
    const ro = new ResizeObserver(mesurer)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument
    const win = doc?.defaultView
    const racine = containerRef.current
    if (!doc || !win) return

    const aligner = (): boolean => {
      if (!selectedSectionId) {
        win.scrollTo(0, 0)
        return true
      }
      const cible = doc.querySelector(`[data-cms-id="${CSS.escape(selectedSectionId)}"]`)
      if (cible instanceof win.HTMLElement) {
        win.scrollTo(0, cible.offsetTop)
        return true
      }
      return false
    }

    if (aligner()) return
    if (!racine) return
    const mo = new MutationObserver(() => {
      if (aligner()) mo.disconnect()
    })
    mo.observe(racine, { childList: true, subtree: true })
    return () => mo.disconnect()
  }, [selectedSectionId, miseEnPage, cadre, locale, ready])

  const sectionsApercu = sections
  const largeur = LARGEUR_CADRE[cadre]
  const bezel = BEZEL_CADRE[cadre]
  const scale = echelleCadreApercu(scene.w, largeur, 16 + bezel * 2)
  const hauteurInterne = Math.max(1, scene.h - bezel * 2)
  const hauteurIframe = hauteurVerreApercu(hauteurInterne, scale)
  const largeurVerre = Math.max(1, Math.round(largeur * scale))

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    let docActif: Document | null = null
    const hoverRef = { actuel: null as HTMLElement | null }

    const poserHover = (el: HTMLElement | null) => {
      if (hoverRef.actuel === el) return
      hoverRef.actuel?.classList.remove('is-cms-hover')
      hoverRef.actuel = el
      el?.classList.add('is-cms-hover')
    }

    const lireCible = (e: MouseEvent, forcerChrome = false): CibleCms | null => {
      const doc = iframe.contentDocument
      const win = doc?.defaultView
      const cible = e.target as HTMLElement | null
      if (!cible || !doc || !win) return null
      const commandeChrome = forcerChrome || Boolean(cible.closest('a, button'))
      const trouvee = cibleDepuisPoint(doc, win, e.clientX, e.clientY, commandeChrome)
      if (trouvee) return trouvee
      const wrap = cible.closest('[data-cms-id]') as HTMLElement | null
      if (!wrap) return null
      return { wrap, slotEl: cible.closest('[data-cms-slot]') as HTMLElement | null }
    }

    const altRef = { id: '', slot: '' }
    const onMove = (e: MouseEvent) => {
      const cible = lireCible(e)
      const el = cible ? (cible.slotEl ?? cible.wrap) : null
      poserHover(el)
      if (!e.altKey || !cible || !onPickSection) {
        altRef.id = ''
        altRef.slot = ''
        return
      }
      const id = cible.wrap.getAttribute('data-cms-id')
      const slot = cible.slotEl?.getAttribute('data-cms-slot') ?? ''
      if (!id || (altRef.id === id && altRef.slot === slot)) return
      altRef.id = id
      altRef.slot = slot
      onPickSection(id, {
        slot: slot || null,
        shift: false,
        toggle: false,
      })
    }

    const onLeave = () => poserHover(null)

    const onClick = (e: MouseEvent) => {
      clicRef.current = { x: e.clientX, y: e.clientY }
      const cible = lireCible(e)
      const edition = editionRef.current
      const slotClique = cible?.slotEl ?? null
      if (edition && slotClique === edition.el && !groupMode) {
        const raw = e.target as HTMLElement | null
        if (raw?.closest('a, button')) e.preventDefault()
        return
      }
      if (!cible) {
        if (edition) onClearSlots?.()
        return
      }
      if (!onPickSection) return
      const id = cible.wrap.getAttribute('data-cms-id')
      if (!id) return
      const raw = e.target as HTMLElement | null
      if (raw?.closest('a, button')) e.preventDefault()
      e.preventDefault()
      e.stopPropagation()
      iframe.contentWindow?.focus()
      onPickSection(id, {
        slot: cible.slotEl?.getAttribute('data-cms-slot') ?? null,
        shift: e.shiftKey,
        toggle: e.metaKey || e.ctrlKey,
      })
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (groupMode) onExitGroupMode?.()
        else onClearSlots?.()
        return
      }
      if (saisieEnCours(e.target) || saisieEnCours(document.activeElement)) return
      const avecModif = raccourciModificateur(e)
      if (avecModif && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        const doc = iframe.contentDocument
        if (!doc || !selectedSectionId) return
        const wrap = doc.querySelector(`[data-cms-id="${CSS.escape(selectedSectionId)}"]`)
        if (!(wrap instanceof HTMLElement)) return
        const slots: string[] = []
        wrap.querySelectorAll('[data-cms-slot]').forEach((n) => {
          const slot = n.getAttribute('data-cms-slot')
          if (slot && !slots.includes(slot)) slots.push(slot)
        })
        onSelectAllSlots?.(selectedSectionId, slots)
        return
      }
      if (avecModif && e.shiftKey && e.key.toLowerCase() === 'g') {
        e.preventDefault()
        onUngroupShortcut?.()
        return
      }
      if (avecModif && e.key.toLowerCase() === 'g') {
        e.preventDefault()
        onGroupShortcut?.()
      }
    }

    const onParentKey = (e: KeyboardEvent) => {
      const doc = iframe.contentDocument
      if (doc?.hasFocus()) return
      if (document.activeElement !== iframe) return
      onKey(e)
    }

    const brancher = () => {
      const doc = iframe.contentDocument
      if (docActif) {
        docActif.removeEventListener('click', onClick)
        docActif.removeEventListener('mousemove', onMove)
        docActif.removeEventListener('mouseleave', onLeave)
        docActif.defaultView?.removeEventListener('keydown', onKey)
      }
      docActif = doc
      doc?.addEventListener('click', onClick)
      doc?.addEventListener('mousemove', onMove)
      doc?.addEventListener('mouseleave', onLeave)
      doc?.defaultView?.addEventListener('keydown', onKey)
    }
    brancher()
    iframe.addEventListener('load', brancher)
    window.addEventListener('keydown', onParentKey)
    return () => {
      iframe.removeEventListener('load', brancher)
      window.removeEventListener('keydown', onParentKey)
      docActif?.removeEventListener('click', onClick)
      docActif?.removeEventListener('mousemove', onMove)
      docActif?.removeEventListener('mouseleave', onLeave)
      docActif?.defaultView?.removeEventListener('keydown', onKey)
      poserHover(null)
    }
  }, [
    onPickSection,
    onClearSlots,
    onExitGroupMode,
    onSelectAllSlots,
    onGroupShortcut,
    onUngroupShortcut,
    selectedSectionId,
    ready,
    locale,
    miseEnPage,
    sections.length,
    groupMode,
    onClearSlots,
  ])

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument
    if (!doc) return
    if (!doc.getElementById('cms-pick-style')) {
      const feuille = doc.createElement('style')
      feuille.id = 'cms-pick-style'
      feuille.textContent = STYLE_CIBLE_CMS.replace(/\s+/g, ' ').trim()
      doc.head.appendChild(feuille)
    }
    const appliquer = () => {
      doc.documentElement.classList.toggle('is-cms-group-mode', groupMode)
      doc.querySelectorAll('[data-cms-id]').forEach((el) => {
        const node = el as HTMLElement
        node.classList.toggle('is-cms-picked', node.getAttribute('data-cms-id') === selectedSectionId)
        if (!node.querySelector('[data-cms-slot]')) {
          node.title = `${libelleCible(node, null)} — cliquer pour modifier`
        }
      })
      doc.querySelectorAll('[data-cms-slot]').forEach((el) => {
        const node = el as HTMLElement
        const slot = node.getAttribute('data-cms-slot')
        const wrap = node.closest('[data-cms-id]') as HTMLElement | null
        const memeSection = !selectedSectionId || wrap?.getAttribute('data-cms-id') === selectedSectionId
        node.classList.toggle('is-cms-slot-picked', Boolean(memeSection && slot && selectedSlots.includes(slot)))
        node.classList.toggle('is-cms-grouped', Boolean(memeSection && slot && groupedSlots.includes(slot)))
        if (wrap) {
          const titre = `${libelleCible(wrap, node)} — cliquer pour modifier`
          node.title = titre
          node.setAttribute('aria-label', titre)
        }
      })
    }
    appliquer()
    const racine = containerRef.current ?? doc.body
    const mo = new MutationObserver(appliquer)
    mo.observe(racine, { childList: true, subtree: true })
    return () => mo.disconnect()
  }, [selectedSectionId, selectedSlots, groupedSlots, groupMode, ready, miseEnPage, sections.length, chromeTick])

  useEffect(() => {
    const iframe = iframeRef.current
    const doc = iframe?.contentDocument
    if (!doc) return

    let stop: AbortController | null = null

    const relacher = (el: HTMLElement | null) => {
      if (!el) return
      el.removeAttribute('contenteditable')
      el.removeAttribute('spellcheck')
      el.removeAttribute('data-cms-oneline')
    }

    const terminer = () => {
      stop?.abort()
      stop = null
      const ed = editionRef.current
      if (ed) relacher(ed.el)
      editionRef.current = null
      onCibleApercuRef.current?.(null)
    }

    const slotSeul = !groupMode && selectedSectionId && selectedSlots.length === 1 ? selectedSlots[0] : null
    const chrome = selectedSectionId === 'cms-header' || selectedSectionId === 'cms-footer'
    if (!slotSeul || !selectedSectionId || chrome || !peutEditerSlot?.(selectedSectionId, slotSeul)) {
      terminer()
      return
    }

    const profile = profilSlot?.(selectedSectionId, slotSeul) ?? 'plain'

    const lire = (el: HTMLElement) => {
      if (profile === 'plain') return (el.innerText || el.textContent || '').replace(/\s*\n+\s*/g, ' ')
      const brut = el.innerHTML
      return sanitizeInlineHtml(brut, profile === 'rich' ? 'rich' : 'inline')
    }

    const relier = (): boolean => {
      const wrap = doc.querySelector(`[data-cms-id="${CSS.escape(selectedSectionId)}"]`)
      const trouve = wrap?.querySelector(`[data-cms-slot="${CSS.escape(slotSeul)}"]`)
      if (!(trouve instanceof HTMLElement)) return false
      if (slotContientWidget(trouve)) {
        terminer()
        return true
      }
      const ed = editionRef.current
      if (ed?.el === trouve) return true

      stop?.abort()
      if (ed) relacher(ed.el)

      trouve.setAttribute('contenteditable', 'true')
      trouve.setAttribute('spellcheck', 'true')
      if (profile !== 'rich') trouve.setAttribute('data-cms-oneline', '1')

      stop = new AbortController()
      const { signal } = stop
      const caretSauve = ed && ed.id === selectedSectionId && ed.slot === slotSeul ? ed.caret : offsetCaret(trouve)

      editionRef.current = {
        id: selectedSectionId,
        slot: slotSeul,
        el: trouve,
        profile,
        caret: caretSauve,
      }
      onCibleApercuRef.current?.({ doc, root: trouve, profile })

      const pousser = () => {
        const actuel = editionRef.current
        if (!actuel) return
        actuel.caret = offsetCaret(actuel.el)
        onSlotHtmlRef.current?.(actuel.id, actuel.slot, lire(actuel.el))
      }

      trouve.addEventListener('input', pousser, { signal })
      trouve.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && profile !== 'rich') e.preventDefault()
      }, { signal })
      trouve.addEventListener('paste', (e) => {
        e.preventDefault()
        const ce = e as ClipboardEvent
        const html = ce.clipboardData?.getData('text/html') ?? ''
        const plain = ce.clipboardData?.getData('text/plain') ?? ''
        const fragment = collerExterne(html || null, plain, profile === 'rich' ? 'rich' : 'inline')
        insertNode(trouve, fragment, null)
        pousser()
      }, { signal })

      trouve.focus()
      const clic = clicRef.current
      let pose = false
      if (clic) {
        const range = caretDepuisPoint(doc, clic.x, clic.y)
        if (range && trouve.contains(range.startContainer)) {
          const sel = doc.getSelection()
          sel?.removeAllRanges()
          sel?.addRange(range)
          pose = true
        }
      }
      if (!pose) poserCaret(trouve, caretSauve)
      editionRef.current.caret = offsetCaret(trouve)
      return true
    }

    relier()
    const racine = containerRef.current ?? doc.body
    const mo = new MutationObserver(() => {
      const ed = editionRef.current
      if (ed && doc.contains(ed.el) && ed.el.isContentEditable) return
      relier()
      const next = editionRef.current
      if (next && ed) poserCaret(next.el, ed.caret)
    })
    mo.observe(racine, { childList: true, subtree: true })
    return () => {
      mo.disconnect()
      terminer()
    }
  }, [
    selectedSectionId,
    selectedSlots,
    groupMode,
    peutEditerSlot,
    profilSlot,
    ready,
    locale,
    miseEnPage,
    sections.length,
    chromeTick,
  ])

  const agrandirLibelle = apercuElargi ? 'Revenir à l’édition' : 'Agrandir l’aperçu'
  const badgePub = publicationState === 'live'
    ? { label: 'Publié', className: 'is-live' }
    : publicationState === 'outdated'
      ? { label: 'À mettre à jour', className: 'is-warn' }
      : { label: 'Brouillon', className: 'is-draft' }

  return (
    <div className="admin-preview-pane">
      <div className="admin-preview-toolbar">
        <div className="admin-preview-toolbar-start">
          <div className="admin-editor-col-title">Aperçu</div>
          <span className={`admin-chip ${badgePub.className}`} role="status">
            {badgePub.label}
          </span>
          <p
            role="status"
            className={groupMode ? 'admin-editor-col-sub is-emphasis' : 'admin-editor-col-sub'}
          >
            {groupMode
              ? 'Cliquez les textes à regrouper dans l’aperçu'
              : 'Cliquez un texte dans l’aperçu pour le modifier ici.'}
          </p>
        </div>
        <div className="admin-preview-toolbar-end">
          <div className="admin-apercu-segment" role="group" aria-label="Affichage Bureau ou Téléphone">
            {([
              { id: 'bureau' as const, label: 'Bureau' },
              { id: 'telephone' as const, label: 'Téléphone' },
            ]).map((item) => {
              const actif = cadre === item.id
              return (
                <Bouton
                  key={item.id}
                  genre={actif ? 'actif' : 'secondaire'}
                  aria-pressed={actif}
                  onClick={() => setCadre(item.id)}
                >
                  {item.label}
                </Bouton>
              )
            })}
          </div>
          {onApercuElargiChange && (
            <Bouton
              carre
              genre={apercuElargi ? 'actif' : 'secondaire'}
              aria-pressed={apercuElargi}
              aria-label={agrandirLibelle}
              title={apercuElargi
                ? 'Réafficher Structure et Modifier'
                : 'Masquer Structure et Modifier pour mieux voir le site'}
              onClick={() => onApercuElargiChange(!apercuElargi)}
            >
              <span aria-hidden="true">
                {apercuElargi ? Icon.collapse(16, 'currentColor') : Icon.expand(16, 'currentColor')}
              </span>
            </Bouton>
          )}
        </div>
      </div>
      <div className="admin-apercu-stage-bar" aria-hidden="true" />
      <div
        ref={sceneRef}
        className="admin-apercu-scene"
        data-cadre={cadre}
      >
        {!scenePrete && (
          <div role="status" className="admin-apercu-loading">
            Préparation de l’aperçu…
          </div>
        )}
        {scenePrete && (
          <div
            className="admin-apercu-cadre"
            data-cadre={cadre}
            style={{
              boxSizing: 'border-box',
              width: largeurVerre + bezel * 2,
              height: '100%',
              borderRadius: RAYON_CADRE[cadre],
              border: `${bezel}px solid ${cadre === 'telephone' ? 'var(--admin-ink)' : 'var(--admin-line)'}`,
              overflow: 'hidden',
              position: 'relative',
              background: t.bg,
            }}
          >
            <iframe
              data-admin-canvas="public"
              ref={iframeRef}
              tabIndex={0}
              title={cadre === 'telephone' ? 'Aperçu du site sur téléphone' : 'Aperçu du site sur bureau'}
              allow="autoplay; fullscreen"
              sandbox="allow-same-origin allow-scripts"
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: largeur,
                height: hauteurIframe,
                border: 0,
                background: t.bg,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }}
            />
          </div>
        )}
        {scenePrete && ready > 0 && containerRef.current && createPortal(
          <PreviewShell typo={typo}>
            <CartProvider>
              <PublicNav
                key={`nav-${chromeTick}`}
                overlay={miseEnPageSurBanniere(miseEnPage)}
                locale={locale}
                restaurant={restaurant ?? RESTAURANT_ABSENT}
                liens={liensEntete}
                presentation={presentation}
                selectable
              />
              <PageRenderer
                key={miseEnPage}
                page={{
                  id: 'preview',
                  slug: '',
                  title: {},
                  status: 'draft',
                  sortOrder: 0,
                  seo: {},
                  layout: miseEnPage,
                  publishedAt: null,
                  createdAt: '',
                  updatedAt: '',
                  updatedBy: null,
                }}
                sections={sectionsApercu}
                locale={locale}
                restaurant={restaurant ?? RESTAURANT_ABSENT}
                preview
                layout={miseEnPage}
                pied={<Footer key={`pied-${chromeTick}`} restaurant={restaurant ?? RESTAURANT_ABSENT} locale={locale} liens={liensPied} presentation={presentation} selectable />}
              />
            </CartProvider>
          </PreviewShell>,
          containerRef.current,
        )}
      </div>
    </div>
  )
}

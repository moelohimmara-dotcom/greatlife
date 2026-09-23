/**
 * Greatlife â€” CMS : Ã©diteur de pages
 * ===================================
 * Layout 3 colonnes (TDR Â§10) :
 *   Structure (liste draggable) | AperÃ§u (renderer) | Modifier (formulaire)
 *
 * Ce composant est le point d'entrÃ©e de l'Ã©diteur. Il est intÃ©grÃ© dans
 * AdminPanel Ã  la place de l'Ã©cran `content` existant.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { empreinteSauvegarde } from '@/cms/model/save-plan'
import { useSite } from '@/contexts/SiteContext'
import type { PageSection } from '@/cms/model/section'
import type { PageStatus } from '@/cms/model/page'
import { dispositionBannierePourMiseEnPage, type PageLayout } from '@/cms/model/page-layout'
import type { PublicationReport } from '@/cms/model/publishing'
import {
  SETTING_KEYS,
  fetchSetting,
  flushRestaurantDrafts,
  resolveRestaurant,
  toRestaurantSettings,
  completerRestaurantDepuisPlat,
  type ResolvedRestaurant,
  type RestaurantSettings,
} from '@/cms/repository/settings'
import { useEditor } from './useEditor'
import { resoudreEtatConsole } from './console-etat'
import { useBrouillonHistory, saisieTexteSeule } from './draft-history'
import { SectionList } from './SectionList'
import { PreviewPane } from './PreviewPane'
import { PropertyPanel } from './PropertyPanel'
import { ChromePanel } from './ChromePanel'
import { PublicationPanel } from './PublicationPanel'
import { SeoPanel } from './SeoPanel'
import type { PageSeo } from '@/cms/model/page'
import { SectionTypePicker } from './SectionTypePicker'
import { GhostButton, PrimaryButton, StatusPill } from '@/admin/ui'
import { Bouton, CIBLE, HAUTEUR } from './chrome'
import { Icon } from '@/lib/icons'
import { chromeDepuisReglages, type ChromePresentation } from '@/cms/model/sections/chrome-presentation'
import type { LienChrome } from '@/cms/model/sections/site-chrome'
import { typoDepuisReglages, type TypoReglages } from '@/cms/model/sections/typo'
import {
  applyGroupModeClick,
  canGroup,
  EMPTY_SELECTION,
  findGroupForSlot,
  groupSelection,
  readEditorMeta,
  selectClick,
  ungroup,
  type SelectionState,
} from '@/cms/model/subblocks'
import { ecrireChampLocale, peutEditerInplace, profilInplace } from '@/cms/model/inplace'
import { getSectionDefinition } from '@/cms/model/sections/schemas'
import type { CibleApercu } from './inplace-dom'

interface PageEditorProps {
  /** Titre affichÃ© dans la barre â€” pas le nom de lâ€™Ã©cran de console. */
  pageLabel?: string
  /** ID de la page Ã  Ã©diter. */
  pageId: string
  /** Sections initiales (chargÃ©es depuis la base). */
  initialSections: PageSection[]
  /** Statut de publication : c'est lui qui dÃ©cide si le public voit le CMS. */
  status: PageStatus
  layout: PageLayout
  onLayoutChange: (layout: PageLayout) => void | Promise<void>
  flushLayout?: () => void | Promise<void>
  layoutPersisting?: boolean
  layoutDirty?: boolean
  seo: PageSeo
  onSeoChange: (seo: PageSeo) => void
  seoPersisting?: boolean
  flushSeo?: () => void | Promise<void>
  publishing: boolean
  onPublish: () => void
  onUnpublish: () => void
  blockedReport?: PublicationReport | null
  actionError?: string | null
  /** ConservÃ© pour compat : la sortie se fait via le menu latÃ©ral (hamburger / rail). */
  onQuitConsole?: () => void
  onOuvrirApparence?: () => void
}

export function PageEditor({
  pageLabel = 'Page dâ€™accueil',
  pageId,
  initialSections,
  status,
  layout,
  onLayoutChange,
  flushLayout,
  layoutPersisting = false,
  layoutDirty = false,
  seo,
  onSeoChange,
  seoPersisting = false,
  flushSeo,
  publishing,
  onPublish,
  onUnpublish,
  blockedReport = null,
  actionError = null,
  onOuvrirApparence,
}: PageEditorProps) {
  const { theme: t, content: platSite } = useSite()
  const editor = useEditor(pageId, initialSections)
  const historique = useBrouillonHistory()
  const restoringRef = useRef(false)
  const editorRef = useRef(editor)
  editorRef.current = editor
  const layoutRef = useRef(layout)
  layoutRef.current = layout

  const capturerBrouillon = useCallback(() => ({
    sections: structuredClone(editorRef.current.sections),
    removedIds: [...editorRef.current.removedIds],
    selected: editorRef.current.selected,
    layout: layoutRef.current,
  }), [])

  const noterHistorique = useCallback((kind: 'coalesce' | 'immediate') => {
    if (restoringRef.current) return
    historique.noter(kind, capturerBrouillon())
  }, [capturerBrouillon, historique])

  const appliquerBrouillon = useCallback((snap: ReturnType<typeof capturerBrouillon>) => {
    restoringRef.current = true
    editor.replaceDraft(snap.sections, snap.removedIds, snap.selected)
    if (snap.layout !== layoutRef.current) void onLayoutChange(snap.layout)
    window.requestAnimationFrame(() => {
      restoringRef.current = false
    })
  }, [editor, onLayoutChange])

  const annuler = useCallback(() => {
    const prev = historique.undo(capturerBrouillon())
    if (prev) appliquerBrouillon(prev)
  }, [appliquerBrouillon, capturerBrouillon, historique])

  const retablir = useCallback(() => {
    const next = historique.redo(capturerBrouillon())
    if (next) appliquerBrouillon(next)
  }, [appliquerBrouillon, capturerBrouillon, historique])

  /*
    L'APERÃ‡U DOIT MONTRER LES VRAIES COORDONNÃ‰ES (revue du 2026-09-20, I-4).

    Lecture A (`site_content.restaurant`) puis repli B (plat `site_config`)
    une fois au chargement. Le public, lui, lit lâ€™instantanÃ© chrome â€” pas
    `fetchSetting` en direct.
  */
  const [restaurant, setRestaurant] = useState<ResolvedRestaurant | undefined>(undefined)
  const [chromePresentation, setChromePresentation] = useState<ChromePresentation>({})
  const [liensEntete, setLiensEntete] = useState<LienChrome[] | undefined>(undefined)
  const [liensPied, setLiensPied] = useState<LienChrome[] | undefined>(undefined)
  const [typo, setTypo] = useState<TypoReglages | null>(null)
  useEffect(() => {
    let actif = true
    fetchSetting(SETTING_KEYS.restaurant).then((result) => {
      if (!actif || !result.ok) return
      const raw = completerRestaurantDepuisPlat(result.data ?? {}, {
        restaurantName: platSite.restaurantName,
        phone: platSite.phone,
        address: platSite.address,
        hours: platSite.hours,
        emailContact: platSite.emailContact,
        emailReservation: platSite.emailReservation,
        slogan: platSite.slogan,
      })
      setRestaurant(resolveRestaurant(toRestaurantSettings(raw), editor.locale))
      setChromePresentation(chromeDepuisReglages(raw))
      setTypo(typoDepuisReglages(raw))
    })
    return () => {
      actif = false
    }
  }, [editor.locale, platSite.restaurantName, platSite.phone, platSite.address, platSite.emailContact])
  const [showPicker, setShowPicker] = useState(false)
  const [showPublication, setShowPublication] = useState(false)
  const [showSeo, setShowSeo] = useState(false)
  const [plusOuvert, setPlusOuvert] = useState(false)
  const plusRef = useRef<HTMLDivElement>(null)
  const [apercuElargi, setApercuElargi] = useState(false)
  const [chrome, setChrome] = useState<'header' | 'footer' | null>(null)
  const [chromeTick, setChromeTick] = useState(0)
  const [slotSel, setSlotSel] = useState<SelectionState>(EMPTY_SELECTION)
  const slotSelRef = useRef(slotSel)
  slotSelRef.current = slotSel
  const [cibleApercu, setCibleApercu] = useState<CibleApercu | null>(null)
  const [focusDepuisApercu, setFocusDepuisApercu] = useState(false)

  const appliquerPointeur = useCallback((id: string, detail?: { slot: string | null; shift: boolean; toggle?: boolean }) => {
    setFocusDepuisApercu(true)
    if (editor.groupMode && id !== 'cms-header' && id !== 'cms-footer') {
      if (!detail?.slot) return
      setChrome(null)
      editor.selectById(id)
      const index = editor.sections.findIndex((s) => s.id === id)
      if (index < 0) return
      const section = editor.sections[index]
      const actuel = section.content ?? {}
      const { content, selection } = applyGroupModeClick(
        actuel,
        slotSelRef.current,
        {
          surface: 'page',
          sectionId: id,
          slot: detail.slot,
          shift: false,
        },
      )
      if (content !== actuel) {
        noterHistorique('immediate')
        editor.updateContent(index, content)
      }
      setSlotSel(selection)
      return
    }
    if (id === 'cms-header') {
      setChrome('header')
      editor.select(null)
      setSlotSel((prev) => selectClick(prev, {
        surface: 'header',
        sectionId: null,
        slot: detail?.slot ?? null,
        shift: Boolean(detail?.shift),
        toggle: Boolean(detail?.toggle),
      }))
      return
    }
    if (id === 'cms-footer') {
      setChrome('footer')
      editor.select(null)
      setSlotSel((prev) => selectClick(prev, {
        surface: 'footer',
        sectionId: null,
        slot: detail?.slot ?? null,
        shift: Boolean(detail?.shift),
        toggle: Boolean(detail?.toggle),
      }))
      return
    }
    setChrome(null)
    editor.selectById(id)
    setSlotSel((prev) => selectClick(prev, {
      surface: 'page',
      sectionId: id,
      slot: detail?.slot ?? null,
      shift: Boolean(detail?.shift),
      toggle: Boolean(detail?.toggle),
    }))
  }, [editor, noterHistorique])

  const viderSelectionEmplacements = useCallback(() => {
    setSlotSel((prev) => ({ ...prev, slots: [], groupId: null }))
  }, [])

  const selectionnerTousEmplacements = useCallback((id: string, slots: string[]) => {
    if (id === 'cms-header') {
      setChrome('header')
      editor.select(null)
      setSlotSel({ surface: 'header', sectionId: null, slots, groupId: null })
      return
    }
    if (id === 'cms-footer') {
      setChrome('footer')
      editor.select(null)
      setSlotSel({ surface: 'footer', sectionId: null, slots, groupId: null })
      return
    }
    setChrome(null)
    editor.selectById(id)
    setSlotSel({ surface: 'page', sectionId: id, slots, groupId: null })
  }, [editor])

  const grouperRaccourci = useCallback(() => {
    const sel = slotSelRef.current
    if (sel.surface === 'page' && sel.sectionId) {
      const index = editor.sections.findIndex((s) => s.id === sel.sectionId)
      if (index >= 0) {
        const section = editor.sections[index]
        const content = section.content ?? {}
        if (canGroup(content, sel.slots, sel.surface).ok) {
          const next = groupSelection(content, sel.slots, {
            id: `g-${sel.slots.join('_')}`,
            label: 'Groupe',
          })
          noterHistorique('immediate')
          editor.updateContent(index, next)
          const created = readEditorMeta(next).groups.find((g) =>
            g.slots.length === sel.slots.length && sel.slots.every((s) => g.slots.includes(s)),
          )
          setSlotSel({
            surface: 'page',
            sectionId: section.id,
            slots: created?.slots ?? sel.slots,
            groupId: created?.id ?? null,
          })
          return
        }
      }
    }
    if (editor.groupMode) editor.stopGroupMode()
    else editor.startGroupMode()
  }, [editor, noterHistorique])

  const appliquerClicGroupe = useCallback((index: number, slot: string) => {
    const cible = editor.sections[index]
    if (!cible) return
    editor.select(index)
    setChrome(null)
    const actuel = cible.content ?? {}
    const { content, selection } = applyGroupModeClick(
      actuel,
      slotSelRef.current,
      {
        surface: 'page',
        sectionId: cible.id,
        slot,
        shift: false,
      },
    )
    if (content !== actuel) {
      noterHistorique('immediate')
      editor.updateContent(index, content)
    }
    setSlotSel(selection)
  }, [editor, noterHistorique])

  const degrouperRaccourci = useCallback(() => {
    const sel = slotSelRef.current
    if (sel.surface !== 'page' || !sel.sectionId) return
    const index = editor.sections.findIndex((s) => s.id === sel.sectionId)
    if (index < 0) return
    const content = editor.sections[index].content ?? {}
    const meta = readEditorMeta(content)
    const groupe = sel.groupId
      ? meta.groups.find((g) => g.id === sel.groupId)
      : (sel.slots[0] ? findGroupForSlot(meta.groups, sel.slots[0]) : undefined)
    if (!groupe) return
    noterHistorique('immediate')
    editor.updateContent(index, ungroup(content, groupe.id))
    setSlotSel((prev) => ({ ...prev, groupId: null }))
  }, [editor, noterHistorique])

  // Une publication bloquÃ©e doit Ãªtre EXPLIQUÃ‰E, pas seulement refusÃ©e.
  useEffect(() => {
    if (blockedReport) setShowPublication(true)
  }, [blockedReport])

  // Section actuellement sÃ©lectionnÃ©e (objet, pas juste l'index)
  const selectedSection = chrome ? null : (editor.selected !== null ? editor.sections[editor.selected] : null)

  const appliquerRestaurant = useCallback((settings: RestaurantSettings) => {
    setRestaurant(resolveRestaurant(settings, editor.locale))
    setChromeTick((n) => n + 1)
  }, [editor.locale])

  const isPublished = status === 'published'

  const saveRef = useRef(editor.save)
  saveRef.current = editor.save
  const savedFp = useRef(empreinteSauvegarde(initialSections) + '#')

  useEffect(() => {
    const fp = empreinteSauvegarde(editor.sections) + '#' + editor.removedIds.join(',')
    if (fp === savedFp.current) return
    if (editor.saving) return
    const t = window.setTimeout(async () => {
      const ok = await saveRef.current()
      if (ok) savedFp.current = fp
    }, 1200)
    return () => window.clearTimeout(t)
  }, [editor.sections, editor.removedIds, editor.saving])

  const empreinteCourante = empreinteSauvegarde(editor.sections) + '#' + editor.removedIds.join(',')
  const brouillonSale = empreinteCourante !== savedFp.current || layoutDirty

  /** Empreinte du contenu au dernier alignement avec le site public (chargement publiÃ© ou publication rÃ©ussie). */
  const fpPublieRef = useRef<string | null>(
    status === 'published' ? empreinteSauvegarde(initialSections) + '#' : null,
  )
  const publishingRef = useRef(publishing)
  useEffect(() => {
    const finPubOk = publishingRef.current && !publishing && status === 'published' && !actionError
    publishingRef.current = publishing
    if (finPubOk) {
      fpPublieRef.current = empreinteSauvegarde(editor.sections) + '#' + editor.removedIds.join(',')
    }
  }, [publishing, status, actionError, editor.sections, editor.removedIds])

  const horsSyncPublic = isPublished
    ? (fpPublieRef.current === null || empreinteCourante !== fpPublieRef.current || layoutDirty)
    : true

  const consoleEtat = resoudreEtatConsole({
    erreurSauvegarde: editor.error,
    erreurAction: actionError,
    publicationBloquee: Boolean(blockedReport),
    enregistrementEnCours: editor.saving || layoutPersisting,
    brouillonSale,
    sitePasAJour: horsSyncPublic,
    pagePubliee: isPublished,
    avertissement: editor.avertissement,
  })
  const couleurEtat = consoleEtat.teinte === 'accent'
    ? t.accent
    : consoleEtat.teinte === 'gold'
      ? t.gold
      : t.primary

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!brouillonSale) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [brouillonSale])

  /* Quitter via la barre latÃ©rale dÃ©monte l'Ã©diteur : on enregistre ce qui est encore sale
     (l'ancien bouton Tableau de bord faisait ce flush ; le hamburger n'appelle plus handleQuit). */
  useEffect(() => {
    return () => {
      void Promise.resolve(flushLayout?.()).catch(() => {})
      void saveRef.current().catch(() => {})
    }
  }, [flushLayout])

  const choisirMiseEnPage = (next: PageLayout) => {
    noterHistorique('immediate')
    const premiere = editor.sections[0]
    if (premiere?.type === 'hero') {
      const imposee = dispositionBannierePourMiseEnPage(next, premiere.variant)
      if (imposee) editor.setVariant(0, imposee)
    }
    if (editor.sections.length > 0) {
      setChrome(null)
      editor.select(0)
      setSlotSel({
        surface: 'page',
        sectionId: editor.sections[0].id,
        slots: [],
        groupId: null,
      })
    }
    onLayoutChange(next)
  }

  /**
   * Publier engage ce qui est EN BASE : `publishPage` relit la page et ses
   * sections depuis la base, pas l'Ã©tat local de l'Ã©diteur. Une modification
   * non sauvegardÃ©e serait donc silencieusement Ã©cartÃ©e de la publication â€”
   * le restaurateur publierait autre chose que ce qu'il voit.
   * On sauvegarde donc d'abord, et on s'arrÃªte si la sauvegarde a Ã©chouÃ©.
   */
  /**
   * Publier engage ce qui est EN BASE. On sauvegarde d'abord.
   * Une fois le site dÃ©jÃ  en ligne, ce mÃªme geste MET Ã€ JOUR l'instantanÃ©
   * (mise en page comprise) â€” sans Ã§a, le restaurateur n'avait plus que
   * Â« Repasser en brouillon Â» et le public ne bougeait jamais.
   */
  const [flushErreur, setFlushErreur] = useState<string | null>(null)

  const handlePublish = async () => {
    setFlushErreur(null)
    try {
      await Promise.resolve(flushLayout?.())
      await Promise.resolve(flushSeo?.())
      await flushRestaurantDrafts()
    } catch (err) {
      setFlushErreur(
        err instanceof Error
          ? err.message
          : "Lâ€™enregistrement de lâ€™apparence nâ€™a pas abouti. RÃ©essayez avant de publier.",
      )
      return
    }
    const saved = await editor.save()
    if (saved) savedFp.current = empreinteSauvegarde(editor.sections) + '#' + editor.removedIds.join(',')
    if (!saved) return
    onPublish()
  }


  useEffect(() => {
    if (!showPublication && !showSeo && !plusOuvert) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (plusOuvert) setPlusOuvert(false)
      else if (showSeo) setShowSeo(false)
      else setShowPublication(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [plusOuvert, showPublication, showSeo])

  useEffect(() => {
    if (!plusOuvert) return
    const onPointer = (e: PointerEvent) => {
      const racine = plusRef.current
      if (racine && e.target instanceof Node && !racine.contains(e.target)) {
        setPlusOuvert(false)
      }
    }
    window.addEventListener('pointerdown', onPointer)
    return () => window.removeEventListener('pointerdown', onPointer)
  }, [plusOuvert])

  useEffect(() => {
    const saisie = (cible: EventTarget | null) => {
      if (!(cible instanceof HTMLElement)) return false
      const tag = cible.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
      if (cible.isContentEditable) return true
      return Boolean(cible.closest('input, textarea, select, [contenteditable="true"]'))
    }
    const onKey = (e: KeyboardEvent) => {
      if (saisie(e.target) || saisie(document.activeElement)) return
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        const k = e.key.toLowerCase()
        if (k === 'z' && e.shiftKey) {
          e.preventDefault()
          retablir()
          return
        }
        if (k === 'z') {
          e.preventDefault()
          annuler()
          return
        }
        if (k === 'y') {
          e.preventDefault()
          retablir()
          return
        }
      }
      if (e.key === 'Escape' && editor.groupMode) {
        e.preventDefault()
        editor.stopGroupMode()
        return
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'g') {
        e.preventDefault()
        grouperRaccourci()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [annuler, editor.groupMode, editor.stopGroupMode, grouperRaccourci, retablir])

  const aSelection = Boolean(chrome || selectedSection)
  const etatPublicationApercu: 'draft' | 'live' | 'outdated' = !isPublished
    ? 'draft'
    : horsSyncPublic
      ? 'outdated'
      : 'live'

  const enregistrerBrouillon = useCallback(() => {
    void (async () => {
      await Promise.resolve(flushLayout?.())
      const saved = await editor.save()
      if (saved) savedFp.current = empreinteSauvegarde(editor.sections) + '#' + editor.removedIds.join(',')
    })()
  }, [editor, flushLayout])

  const basculerControle = useCallback(() => {
    setShowPublication((open) => {
      const next = !open
      if (next) {
        setApercuElargi(false)
        setShowSeo(false)
      }
      return next
    })
  }, [])

  const basculerSeo = useCallback(() => {
    setShowSeo((open) => {
      const next = !open
      if (next) {
        setApercuElargi(false)
        setShowPublication(false)
      }
      return next
    })
  }, [])

  return (
    <div className="admin-page-editor">
      {/* Quatre rÃ´les : navigation/identitÃ© | statut | langue+historique | actions. */}
      <div className="admin-editor-toolbar" role="toolbar" aria-label="Atelier du site">
        <div className="admin-editor-toolbar-start" role="group" aria-label="Page">
          <div className="admin-editor-toolbar-page">
            <h2 className="admin-editor-toolbar-title" title={pageLabel}>
              Modifier le site
            </h2>
            <small>{pageLabel}</small>
          </div>
          <div className="admin-editor-toolbar-status" role="group" aria-label="Ã‰tat">
            <span className={`admin-wf-cms-save-state${brouillonSale ? '' : ' is-saved'}`}>
              <i aria-hidden="true" />
              {brouillonSale ? 'Brouillon non publiÃ©' : 'EnregistrÃ©'}
            </span>
            <StatusPill
              label={consoleEtat.label}
              color={couleurEtat}
              title={consoleEtat.title}
            />
          </div>
        </div>

        <div className="admin-editor-toolbar-center" role="group" aria-label="Langue et historique">
          <div
            role="group"
            aria-label="Langue de lâ€™aperÃ§u et des textes"
            className="admin-editor-locale"
          >
            {([
              { id: 'fr' as const, court: 'FR', nom: 'FranÃ§ais' },
              { id: 'en' as const, court: 'EN', nom: 'English' },
            ]).map((lang, i) => {
              const actif = editor.locale === lang.id
              return (
                <Bouton
                  key={lang.id}
                  genre={actif ? 'actif' : 'silencieux'}
                  aria-pressed={actif}
                  aria-label={lang.nom}
                  title={lang.nom}
                  onClick={() => editor.setLocale(lang.id)}
                  className={actif ? 'admin-editor-locale-btn is-active' : 'admin-editor-locale-btn'}
                  style={{
                    height: HAUTEUR,
                    minHeight: CIBLE,
                    minWidth: CIBLE,
                    border: 'none',
                    borderRadius: 0,
                    borderLeft: i === 0 ? 'none' : undefined,
                  }}
                >
                  {lang.court}
                </Bouton>
              )
            })}
          </div>
          <div role="group" aria-label="Annuler et rÃ©tablir" className="admin-editor-history">
            <Bouton
              carre
              genre="secondaire"
              disabled={!historique.canUndo}
              aria-label="Annuler"
              title="Annuler â€” les blocs, pas le menu"
              onClick={annuler}
            >
              <span aria-hidden="true">{Icon.undo(16, 'currentColor')}</span>
            </Bouton>
            <Bouton
              carre
              genre="secondaire"
              disabled={!historique.canRedo}
              aria-label="RÃ©tablir"
              title="RÃ©tablir â€” les blocs, pas le menu"
              onClick={retablir}
            >
              <span aria-hidden="true">{Icon.redo(16, 'currentColor')}</span>
            </Bouton>
          </div>
        </div>

        <div className="admin-editor-toolbar-end" role="group" aria-label="Publication">
          {actionError && (
            <span role="alert" className="admin-editor-toolbar-msg is-danger" title={actionError}>
              {actionError}
            </span>
          )}
          {flushErreur && (
            <span role="alert" className="admin-editor-toolbar-msg is-danger" title={flushErreur}>
              {flushErreur}
            </span>
          )}
          {editor.error && (
            <span role="alert" className="admin-editor-toolbar-msg is-danger" title={editor.error}>
              {editor.error}
            </span>
          )}
          {editor.avertissement && !editor.error && !flushErreur && (
            <span role="status" className="admin-editor-toolbar-msg is-warn" title={editor.avertissement}>
              {editor.avertissement}
            </span>
          )}
          <div className="admin-editor-toolbar-secondary" role="group" aria-label="Brouillon et contrÃ´le">
            <GhostButton
              className="admin-editor-toolbar-wide"
              color="currentColor"
              disabled={editor.saving || !brouillonSale}
              busy={editor.saving}
              title="Enregistrer le brouillon sans publier"
              onClick={enregistrerBrouillon}
            >
              {editor.saving ? 'Enregistrementâ€¦' : 'Enregistrer le brouillon'}
            </GhostButton>
            <GhostButton
              className="admin-editor-toolbar-wide"
              color="currentColor"
              aria-pressed={showPublication}
              aria-expanded={showPublication}
              title="VÃ©rifier la page avant publication et consulter les versions enregistrÃ©es."
              onClick={basculerControle}
            >
              ContrÃ´le
            </GhostButton>
            <GhostButton
              className="admin-editor-toolbar-wide"
              color="currentColor"
              aria-pressed={showSeo}
              aria-expanded={showSeo}
              title="Titre Google, texte et image de partage pour cette page."
              onClick={basculerSeo}
            >
              Référencement
            </GhostButton>
          </div>
          <div className="admin-editor-toolbar-plus" ref={plusRef}>
            <Bouton
              carre
              genre="secondaire"
              aria-label="Autres actions"
              aria-haspopup="menu"
              aria-expanded={plusOuvert}
              title="Autres actions"
              onClick={() => setPlusOuvert((o) => !o)}
            >
              <span aria-hidden="true">{Icon.more(16, 'currentColor')}</span>
            </Bouton>
            {plusOuvert ? (
              <div role="menu" className="admin-editor-toolbar-plus-menu">
                <GhostButton
                  color="currentColor"
                  disabled={editor.saving || !brouillonSale}
                  busy={editor.saving}
                  title="Enregistrer le brouillon sans publier"
                  onClick={() => {
                    setPlusOuvert(false)
                    enregistrerBrouillon()
                  }}
                  style={{ width: '100%', justifyContent: 'flex-start' }}
                >
                  {editor.saving ? 'Enregistrementâ€¦' : 'Enregistrer le brouillon'}
                </GhostButton>
                <GhostButton
                  color="currentColor"
                  aria-pressed={showPublication}
                  title="VÃ©rifier la page avant publication et consulter les versions enregistrÃ©es."
                  onClick={() => {
                    setPlusOuvert(false)
                    basculerControle()
                  }}
                  style={{ width: '100%', justifyContent: 'flex-start' }}
                >
                  ContrÃ´le
                </GhostButton>
                <GhostButton
                  color="currentColor"
                  aria-pressed={showSeo}
                  title="Titre Google, texte et image de partage pour cette page."
                  onClick={() => {
                    setPlusOuvert(false)
                    basculerSeo()
                  }}
                  style={{ width: '100%', justifyContent: 'flex-start' }}
                >
                  Référencement
                </GhostButton>
                {isPublished ? (
                  <GhostButton
                    className="admin-editor-unpublish"
                    color="currentColor"
                    disabled={publishing || editor.saving}
                    busy={publishing || editor.saving}
                    title="Retirer cette version : les visiteurs reverront lâ€™ancien site."
                    onClick={() => {
                      setPlusOuvert(false)
                      onUnpublish()
                    }}
                    style={{ width: '100%', justifyContent: 'flex-start' }}
                  >
                    Retirer
                  </GhostButton>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="admin-editor-toolbar-primary" role="group" aria-label="Mise en ligne">
            <PrimaryButton
              className="admin-editor-publish"
              disabled={publishing || editor.saving}
              busy={publishing || editor.saving}
              title={isPublished
                ? 'Les visiteurs verront la mise en page et les textes de cet Ã©cran.'
                : 'Publier : les visiteurs verront ce contenu.'}
              onClick={() => { void handlePublish() }}
            >
              {publishing ? 'Publicationâ€¦' : isPublished ? 'Mettre Ã  jour le site' : 'Publier sur le site'}
            </PrimaryButton>
            {isPublished && (
              <GhostButton
                className="admin-editor-unpublish admin-editor-toolbar-wide"
                color="currentColor"
                disabled={publishing || editor.saving}
                busy={publishing || editor.saving}
                title="Retirer cette version : les visiteurs reverront lâ€™ancien site."
                onClick={onUnpublish}
              >
                Retirer
              </GhostButton>
            )}
          </div>
        </div>
      </div>

      {/* Layout 3 colonnes â€” minmax(0,1fr) : sans Ã§a la rangÃ©e grandit
          avec la liste des blocs, lâ€™aperÃ§u a un 100vh de plusieurs Ã©crans
          et le bas de la fenÃªtre nâ€™est plus que du fond crÃ¨me. */}
      <div
        className={apercuElargi ? 'admin-editor-grid is-preview-wide' : 'admin-editor-grid'}
      >
        {/* Colonne 1 : Structure */}
        <div
          className={[
            'admin-editor-structure',
            showPublication || showSeo ? 'is-locked' : '',
            apercuElargi ? 'is-hidden' : '',
          ].filter(Boolean).join(' ')}
        >
          <div className="admin-editor-col-head">
            <div className="admin-editor-col-title">Structure</div>
            <p className="admin-editor-col-sub">
              Ordre des blocs · textes et listes à l'intérieur
            </p>
          </div>
          <SectionList
            sections={editor.sections}
            selected={chrome ? null : editor.selected}
            selectedSlots={slotSel.sectionId === selectedSection?.id ? slotSel.slots : []}
            selectedGroupId={slotSel.groupId}
            chrome={chrome}
            locale={editor.locale}
            layout={layout}
            onLayoutChange={choisirMiseEnPage}
            layoutDisabled={editor.saving || showPublication}
            onSelect={(index) => {
              setChrome(null)
              setFocusDepuisApercu(false)
              editor.select(index)
              const cible = index !== null ? editor.sections[index] : null
              setSlotSel({
                surface: 'page',
                sectionId: cible?.id ?? null,
                slots: [],
                groupId: null,
              })
            }}
            onSelectSlot={(index, slot, shift) => {
              setFocusDepuisApercu(false)
              if (editor.groupMode) {
                appliquerClicGroupe(index, slot)
                return
              }
              setChrome(null)
              editor.select(index)
              const cible = editor.sections[index]
              setSlotSel(selectClick(slotSel, {
                surface: 'page',
                sectionId: cible?.id ?? null,
                slot,
                shift,
                toggle: false,
              }))
            }}
            onSelectGroup={(index, groupId) => {
              setChrome(null)
              editor.select(index)
              const cible = editor.sections[index]
              setSlotSel(selectClick(slotSel, {
                surface: 'page',
                sectionId: cible?.id ?? null,
                slot: null,
                groupId,
                shift: false,
              }))
            }}
            onSelectChrome={(id) => {
              setChrome(id)
              editor.select(null)
              setSlotSel({ surface: id, sectionId: null, slots: [], groupId: null })
            }}
            onReorder={(from, to) => { noterHistorique('immediate'); editor.reorder(from, to) }}
            onToggleVisibility={(index) => { noterHistorique('immediate'); editor.toggleVisibility(index) }}
            onRemove={(index) => { noterHistorique('immediate'); editor.removeSection(index) }}
            onDuplicate={(index) => {
              noterHistorique('immediate')
              editor.duplicateSection(index)
              setChrome(null)
            }}
            onAdd={() => setShowPicker(true)}
          />
        </div>

        {/* Colonne 2+3 : aperÃ§u + Inspecteur, ou aperÃ§u + ContrÃ´le */}
        <div className={apercuElargi ? 'admin-editor-main is-preview-wide' : 'admin-editor-main'}>
          <div className="admin-editor-preview">
            <PreviewPane
              sections={editor.resolvedSections}
              locale={editor.locale}
              restaurant={restaurant}
              layout={layout}
              publicationState={etatPublicationApercu}
              selectedSectionId={chrome === 'header' ? 'cms-header' : chrome === 'footer' ? 'cms-footer' : (selectedSection?.id ?? null)}
              selectedSlots={
                slotSel.groupId && selectedSection
                  ? (readEditorMeta(selectedSection.content).groups.find((g) => g.id === slotSel.groupId)?.slots ?? slotSel.slots)
                  : slotSel.slots
              }
              groupedSlots={selectedSection ? readEditorMeta(selectedSection.content).groups.flatMap((g) => g.slots) : []}
              groupMode={editor.groupMode}
              onPickSection={appliquerPointeur}
              onClearSlots={viderSelectionEmplacements}
              onExitGroupMode={editor.stopGroupMode}
              onSelectAllSlots={selectionnerTousEmplacements}
              onGroupShortcut={grouperRaccourci}
              onUngroupShortcut={degrouperRaccourci}
              onSlotHtml={(sectionId, slot, html) => {
                const index = editor.sections.findIndex((s) => s.id === sectionId)
                if (index < 0) return
                const section = editor.sections[index]
                const field = getSectionDefinition(section.type)?.fields.find((f) => f.name === slot)
                if (!field || !peutEditerInplace(section.content ?? {}, field)) return
                const next = ecrireChampLocale(
                  section.content ?? {},
                  slot,
                  editor.locale,
                  html,
                  field.translatable !== false,
                )
                noterHistorique(saisieTexteSeule(section.content ?? {}, next) ? 'coalesce' : 'immediate')
                editor.updateContent(index, next)
              }}
              peutEditerSlot={(sectionId, slot) => {
                const section = editor.sections.find((s) => s.id === sectionId)
                if (!section) return false
                const field = getSectionDefinition(section.type)?.fields.find((f) => f.name === slot)
                return peutEditerInplace(section.content ?? {}, field)
              }}
              profilSlot={(sectionId, slot) => {
                const section = editor.sections.find((s) => s.id === sectionId)
                if (!section) return null
                const field = getSectionDefinition(section.type)?.fields.find((f) => f.name === slot)
                if (!field) return null
                return profilInplace(field)
              }}
              onCibleApercu={setCibleApercu}
              apercuElargi={apercuElargi}
              onApercuElargiChange={setApercuElargi}
              chromeTick={chromeTick}
              presentation={chromePresentation}
              liensEntete={liensEntete}
              liensPied={liensPied}
              typo={typo}
            />
          </div>

          <div
            className={[
              'admin-editor-inspector',
              apercuElargi ? 'is-hidden' : '',
              aSelection || showPublication || showSeo ? 'has-selection' : '',
              showPublication ? 'is-publication' : '',
            ].filter(Boolean).join(' ')}
          >
            {showPublication ? (
              <div
                className="admin-publication-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="controle-publication-titre"
              >
                <PublicationPanel
                  pageId={pageId}
                  blockedReport={blockedReport}
                  onClose={() => setShowPublication(false)}
                />
              </div>
            ) : showSeo ? (
              <SeoPanel
                seo={seo}
                locale={editor.locale}
                onChange={onSeoChange}
                onClose={() => setShowSeo(false)}
                persisting={seoPersisting}
              />
            ) : (
              <div className="admin-inspector-scroll">
                <div className="admin-editor-col-head">
                  <div className="admin-editor-col-title">Modifier</div>
                </div>
                {chrome ? (
                  <ChromePanel
                    chrome={chrome}
                    locale={editor.locale}
                    onRestaurantResolved={appliquerRestaurant}
                    onPresentationChange={setChromePresentation}
                    onLiensChange={chrome === 'header' ? setLiensEntete : setLiensPied}
                    onOuvrirApparence={onOuvrirApparence}
                  />
                ) : selectedSection ? (
                  <PropertyPanel
                    section={selectedSection}
                    locale={editor.locale}
                    pageLayout={layout}
                    groupMode={editor.groupMode}
                    onStartGroupMode={editor.startGroupMode}
                    onStopGroupMode={editor.stopGroupMode}
                    selection={slotSel.sectionId === selectedSection.id ? slotSel : {
                      surface: 'page',
                      sectionId: selectedSection.id,
                      slots: [],
                      groupId: null,
                    }}
                    onSelectionChange={setSlotSel}
                    eviterFocusChamp={focusDepuisApercu}
                    cibleApercu={cibleApercu}
                    onUpdate={(content) => {
                      const prev = selectedSection.content ?? {}
                      noterHistorique(saisieTexteSeule(prev, content) ? 'coalesce' : 'immediate')
                      editor.updateContent(editor.selected!, content)
                    }}
                    onVariantChange={(variant) => {
                      noterHistorique('immediate')
                      editor.setVariant(editor.selected!, variant)
                    }}
                  />
                ) : (
                  <div className="admin-inspector-empty">
                    <p className="admin-inspector-empty-title">
                      Rien Ã  modifier pour lâ€™instant
                    </p>
                    <p className="admin-inspector-empty-body">
                      Cliquez En-tÃªte ou Pied de page, ou un bloc dans Structure.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showPicker && (
        <SectionTypePicker
          onSelect={(type) => { noterHistorique('immediate'); editor.addSection(type); setShowPicker(false) }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}

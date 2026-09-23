/**
 * Greatlife — CMS : wrapper de l'éditeur de pages
 * ================================================
 * Charge la page, son STATUT de publication et ses sections, puis les passe
 * au `PageEditor`.
 *
 * Le statut est essentiel : c'est lui qui décide si le site public rend le
 * contenu du CMS ou garde son rendu historique (TDR §22). L'éditeur doit donc
 * l'afficher clairement, sinon le restaurateur enregistre sans comprendre
 * pourquoi rien ne change côté visiteurs.
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { useAuth } from '@/contexts/AuthContext'
import type { PageSection } from '@/cms/model/section'
import type { PageSeo, PageStatus } from '@/cms/model/page'
import { normaliserPageSeo } from '@/cms/model/page-seo'
import type { PageLayout } from '@/cms/model/page-layout'
import { DEFAULT_PAGE_LAYOUT } from '@/cms/model/page-layout'
import type { PublicationReport } from '@/cms/model/publishing'
import { fetchAllPages, setPageStatus, updatePage } from '@/cms/repository/pages'
import { fetchSectionsForPage } from '@/cms/repository/sections'
// Publier passe par le contrôle §24 et l'archivage d'une version (Lot 3).
import { publishPage } from '@/cms/repository/publishing'
import { flushRestaurantDrafts } from '@/cms/repository/settings'
import { PageEditor } from './PageEditor'

export function PageEditorWrapper({
  onQuitConsole,
  onOuvrirApparence,
}: {
  onQuitConsole?: () => void
  onOuvrirApparence?: () => void
}) {
  const { theme: t } = useSite()
  const { user } = useAuth()
  const [pageId, setPageId] = useState<string | null>(null)
  const [pageLabel, setPageLabel] = useState('Page d’accueil')
  const [status, setStatus] = useState<PageStatus>('draft')
  const [layout, setLayout] = useState<PageLayout>(DEFAULT_PAGE_LAYOUT)
  const [seo, setSeo] = useState<PageSeo>({})
  const [seoPersisting, setSeoPersisting] = useState(false)
  const seoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wantedSeo = useRef<PageSeo>({})
  const [sections, setSections] = useState<PageSection[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const fileMiseEnPage = useRef(Promise.resolve())
  const wantedLayout = useRef<PageLayout>(DEFAULT_PAGE_LAYOUT)
  const layoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [layoutPersisted, setLayoutPersisted] = useState<PageLayout>(DEFAULT_PAGE_LAYOUT)
  const [layoutPersisting, setLayoutPersisting] = useState(false)
  /** Renseigné quand une publication a été REFUSÉE par les contrôles du TDR §24. */
  const [blockedReport, setBlockedReport] = useState<PublicationReport | null>(null)

  const load = useCallback(async (cancelled?: () => boolean) => {
    try {
      const pagesResult = await fetchAllPages()
      if (cancelled?.()) return
      if (!pagesResult.ok) { setError(pagesResult.error); return }

      const page = pagesResult.data[0]
      if (!page) { setError('Aucune page trouvée.'); return }

      const sectionsResult = await fetchSectionsForPage(page.id, { includeHidden: true })
      if (cancelled?.()) return
      if (!sectionsResult.ok) { setError(sectionsResult.error); return }

      setError(null)
      setActionError(null)
      setPageId(page.id)
      setPageLabel(page.slug ? (typeof page.title === 'string' ? page.title : (page.title.fr || page.title.en || 'Page')) : 'Page d’accueil')
      setStatus(page.status)
      setLayout(page.layout)
      const seoInitial = normaliserPageSeo(page.seo)
      setSeo(seoInitial)
      wantedSeo.current = seoInitial
      wantedLayout.current = page.layout
      setLayoutPersisted(page.layout)
      setSections(sectionsResult.data)
    } catch (err) {
      if (!cancelled?.()) setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      if (!cancelled?.()) setLoading(false)
    }
  }, [])

  useEffect(() => {
    let done = false
    load(() => done)
    return () => { done = true }
  }, [load])

  useEffect(() => {
    return () => {
      if (layoutTimer.current) clearTimeout(layoutTimer.current)
      if (seoTimer.current) clearTimeout(seoTimer.current)
    }
  }, [])

  /**
   * Bascule brouillon ⇄ publié.
   *
   * Publier n'est plus un simple changement de statut : la page doit d'abord
   * passer les 7 contrôles du TDR §24, et une version est archivée AVANT le
   * basculement (TDR §23). Si un contrôle bloque, rien n'est publié et le
   * panneau explique précisément ce qui manque.
   */
  const persistWantedLayout = useCallback(() => {
    if (!pageId) return Promise.resolve()
    const tache = fileMiseEnPage.current.then(async () => {
      const cible = wantedLayout.current
      setLayoutPersisting(true)
      const res = await updatePage(pageId, { layout: cible })
      setLayoutPersisting(false)
      if (!res.ok && wantedLayout.current === cible) {
        setActionError(res.error)
      } else if (res.ok) {
        setActionError(null)
        if (wantedLayout.current === cible) setLayoutPersisted(cible)
      }
    })
    fileMiseEnPage.current = tache.catch(() => {})
    return tache
  }, [pageId])

  const persistWantedSeo = useCallback(() => {
    if (!pageId) return Promise.resolve()
    const cible = wantedSeo.current
    setSeoPersisting(true)
    return updatePage(pageId, { seo: cible }).then((res) => {
      setSeoPersisting(false)
      if (!res.ok && wantedSeo.current === cible) {
        setActionError(res.error)
      } else if (res.ok) {
        setActionError(null)
        if (wantedSeo.current === cible) setSeo(normaliserPageSeo(res.data.seo))
      }
    })
  }, [pageId])

  const changeSeo = useCallback((next: PageSeo) => {
    if (!pageId) return
    const normalise = normaliserPageSeo(next)
    wantedSeo.current = normalise
    setSeo(normalise)
    if (seoTimer.current) clearTimeout(seoTimer.current)
    seoTimer.current = setTimeout(() => {
      seoTimer.current = null
      void persistWantedSeo()
    }, 1200)
  }, [pageId, persistWantedSeo])

  const flushSeo = useCallback(() => {
    if (seoTimer.current) {
      clearTimeout(seoTimer.current)
      seoTimer.current = null
      return persistWantedSeo()
    }
    return Promise.resolve()
  }, [persistWantedSeo])

  const changeLayout = useCallback((next: PageLayout) => {
    if (!pageId) return Promise.resolve()
    wantedLayout.current = next
    setLayout(next)
    if (layoutTimer.current) clearTimeout(layoutTimer.current)
    layoutTimer.current = setTimeout(() => {
      layoutTimer.current = null
      void persistWantedLayout()
    }, 1200)
    return Promise.resolve()
  }, [pageId, persistWantedLayout])

  const flushLayout = useCallback(() => {
    if (layoutTimer.current) {
      clearTimeout(layoutTimer.current)
      layoutTimer.current = null
      return persistWantedLayout()
    }
    return fileMiseEnPage.current
  }, [persistWantedLayout])

  const publishNow = useCallback(async () => {
    if (!pageId) return
    setPublishing(true)
    setActionError(null)
    try {
      await flushLayout()
      await flushSeo()
      await flushRestaurantDrafts()
    } catch (err) {
      setPublishing(false)
      setActionError(
        err instanceof Error
          ? err.message
          : "L’enregistrement de l’apparence n’a pas abouti. Réessayez avant de publier.",
      )
      return
    }
    const res = await publishPage(pageId, user?.email ?? null)
    setPublishing(false)
    if (!res.ok) { setActionError(res.error); return }
    if (!res.data.published) { setBlockedReport(res.data.report); return }
    setBlockedReport(null)
    setActionError(null)
    await load()
  }, [pageId, user?.email, load, flushLayout, flushSeo])

  const unpublishNow = useCallback(async () => {
    if (!pageId) return
    setPublishing(true)
    const res = await setPageStatus(pageId, 'draft')
    setPublishing(false)
    if (!res.ok) { setActionError(res.error); return }
    setActionError(null)
    setStatus(res.data.status)
  }, [pageId])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: t.muted }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>Chargement de l'éditeur…</div>
      </div>
    )
  }

  if (error || !pageId || !sections) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div role="alert" style={{ textAlign: 'center', padding: 32, borderRadius: 12, background: t.surface, border: `1px solid ${t.accent}44`, color: t.accent }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Erreur de chargement</div>
          <div style={{ fontSize: 13 }}>{error ?? 'Aucune page trouvée.'}</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', minHeight: 0, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    <PageEditor
      pageLabel={pageLabel}
      onQuitConsole={onQuitConsole}
      pageId={pageId}
      initialSections={sections}
      status={status}
      layout={layout}
      onLayoutChange={changeLayout}
      flushLayout={flushLayout}
      layoutPersisting={layoutPersisting}
      layoutDirty={layout !== layoutPersisted}
      seo={seo}
      onSeoChange={changeSeo}
      seoPersisting={seoPersisting}
      flushSeo={flushSeo}
      publishing={publishing}
      onPublish={publishNow}
      onUnpublish={unpublishNow}
      blockedReport={blockedReport}
      actionError={actionError}
      onOuvrirApparence={onOuvrirApparence}
    />
    </div>
  )
}

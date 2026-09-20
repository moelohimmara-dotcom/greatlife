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

import { useEffect, useState, useCallback } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { useAuth } from '@/contexts/AuthContext'
import type { PageSection } from '@/cms/model/section'
import type { PageStatus } from '@/cms/model/page'
import type { PageLayout } from '@/cms/model/page-layout'
import { DEFAULT_PAGE_LAYOUT } from '@/cms/model/page-layout'
import type { PublicationReport } from '@/cms/model/publishing'
import { fetchAllPages, setPageStatus, updatePage } from '@/cms/repository/pages'
import { fetchSectionsForPage } from '@/cms/repository/sections'
// Publier passe par le contrôle §24 et l'archivage d'une version (Lot 3).
import { publishPage } from '@/cms/repository/publishing'
import { PageEditor } from './PageEditor'

export function PageEditorWrapper() {
  const { theme: t } = useSite()
  const { user } = useAuth()
  const [pageId, setPageId] = useState<string | null>(null)
  const [status, setStatus] = useState<PageStatus>('draft')
  const [layout, setLayout] = useState<PageLayout>(DEFAULT_PAGE_LAYOUT)
  const [sections, setSections] = useState<PageSection[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
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
      setPageId(page.id)
      setStatus(page.status)
      setLayout(page.layout)
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

  /**
   * Bascule brouillon ⇄ publié.
   *
   * Publier n'est plus un simple changement de statut : la page doit d'abord
   * passer les 7 contrôles du TDR §24, et une version est archivée AVANT le
   * basculement (TDR §23). Si un contrôle bloque, rien n'est publié et le
   * panneau explique précisément ce qui manque.
   */
  const changeLayout = useCallback(async (next: PageLayout) => {
    if (!pageId) return
    const previous = layout
    setLayout(next)
    const res = await updatePage(pageId, { layout: next })
    if (!res.ok) {
      setLayout(previous)
      setError(res.error)
    }
  }, [pageId, layout])

  const publishNow = useCallback(async () => {
    if (!pageId) return
    setPublishing(true)
    const res = await publishPage(pageId, user?.email ?? null)
    setPublishing(false)
    if (!res.ok) { setError(res.error); return }
    if (!res.data.published) { setBlockedReport(res.data.report); return }
    setBlockedReport(null)
    await load()
  }, [pageId, user?.email, load])

  const unpublishNow = useCallback(async () => {
    if (!pageId) return
    setPublishing(true)
    const res = await setPageStatus(pageId, 'draft')
    setPublishing(false)
    if (!res.ok) { setError(res.error); return }
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
    <div style={{ height: '100%', minHeight: 0 }}>
    <PageEditor
      pageId={pageId}
      initialSections={sections}
      status={status}
      layout={layout}
      onLayoutChange={changeLayout}
      publishing={publishing}
      onPublish={publishNow}
      onUnpublish={unpublishNow}
      blockedReport={blockedReport}
    />
    </div>
  )
}

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
import type { PageSection } from '@/cms/model/section'
import type { PageStatus } from '@/cms/model/page'
import { fetchAllPages, setPageStatus } from '@/cms/repository/pages'
import { fetchSectionsForPage } from '@/cms/repository/sections'
import { PageEditor } from './PageEditor'

export function PageEditorWrapper() {
  const { theme: t } = useSite()
  const [pageId, setPageId] = useState<string | null>(null)
  const [status, setStatus] = useState<PageStatus>('draft')
  const [sections, setSections] = useState<PageSection[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)

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

  /** Bascule brouillon ⇄ publié. C'est L'action qui rend le CMS visible. */
  const togglePublish = useCallback(async () => {
    if (!pageId) return
    const target: PageStatus = status === 'published' ? 'draft' : 'published'
    setPublishing(true)
    const res = await setPageStatus(pageId, target)
    setPublishing(false)
    if (!res.ok) { setError(res.error); return }
    setStatus(res.data.status)
  }, [pageId, status])

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
        <div style={{ textAlign: 'center', padding: 32, borderRadius: 12, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Erreur de chargement</div>
          <div style={{ fontSize: 13 }}>{error ?? 'Aucune page trouvée.'}</div>
        </div>
      </div>
    )
  }

  return (
    <PageEditor
      pageId={pageId}
      initialSections={sections}
      status={status}
      publishing={publishing}
      onTogglePublish={togglePublish}
    />
  )
}

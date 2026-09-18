/**
 * Greatlife — CMS : wrapper de l'éditeur
 * ========================================
 * Charge la première page et ses sections depuis la base,
 * puis les passe au PageEditor.
 *
 * Utilisé par AdminPanel à la place de l'ancien ContentEditor.
 */

import { useEffect, useState } from 'react'
import { useSite } from '@/contexts/SiteContext'
import type { PageSection } from '@/cms/model/section'
import { fetchAllPages } from '@/cms/repository/pages'
import { fetchSectionsForPage } from '@/cms/repository/sections'
import { PageEditor } from './PageEditor'

export function PageEditorWrapper() {
  const { theme: t } = useSite()
  const [pageId, setPageId] = useState<string | null>(null)
  const [sections, setSections] = useState<PageSection[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        // 1. Récupérer la première page (la « Accueil »)
        const pagesResult = await fetchAllPages()
        if (cancelled) return
        if (!pagesResult.ok) {
          setError(pagesResult.error)
          return
        }
        const page = pagesResult.data[0]
        if (!page) {
          setError('Aucune page trouvée.')
          return
        }

        // 2. Récupérer toutes les sections (y compris cachées, pour l'éditeur)
        const sectionsResult = await fetchSectionsForPage(page.id, { includeHidden: true })
        if (cancelled) return
        if (!sectionsResult.ok) {
          setError(sectionsResult.error)
          return
        }

        setPageId(page.id)
        setSections(sectionsResult.data)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erreur de chargement')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: t.muted }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>Chargement de l'éditeur…</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#dc2626' }}>
        <div style={{ textAlign: 'center', padding: 32, borderRadius: 12, background: '#fef2f2', border: '1px solid #fecaca' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Erreur de chargement</div>
          <div style={{ fontSize: 13 }}>{error}</div>
        </div>
      </div>
    )
  }

  if (!pageId || !sections) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: t.muted }}>
        <div style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>Aucune page trouvée.</div>
          <div style={{ fontSize: 12, marginTop: 8 }}>La migration 025 doit être appliquée.</div>
        </div>
      </div>
    )
  }

  return <PageEditor pageId={pageId} initialSections={sections} />
}

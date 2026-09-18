/**
 * Greatlife — CMS : colonne Aperçu
 * ==================================
 * Rendu temps réel du site public dans la colonne centrale.
 * Utilise le renderer isomorphe : même code que le site public,
 * mais alimenté par les données locales de l'éditeur.
 *
 * Le rendu est en iframe pour isoler les styles du CMS de ceux du site public.
 */

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { PageSection } from '@/cms/model/section'
import type { Locale } from '@/cms/model/i18n'
import type { ResolvedRestaurant } from '@/cms/repository/settings'
import { SectionRenderer } from '@/cms/renderer/SectionRenderer'

interface PreviewPaneProps {
  sections: PageSection[]
  locale?: Locale
  restaurant?: ResolvedRestaurant
}

/** Réglages restaurant par défaut pour la prévisualisation. */
const DEFAULT_RESTAURANT: ResolvedRestaurant = {
  name: 'Greatlife',
  address: 'Conakry, Guinée',
  hours: 'Tous les jours · 11h00 — 23h00',
  phone: '+224 000 00 00 00',
  emailContact: 'contact@greatlife.gn',
  emailReservation: 'resa@greatlife.gn',
  slogan: 'Manger vite. Manger bio. Manger gourmand.',
  currency: 'FG',
  social: { facebook: '', whatsapp: '', instagram: '' },
}

/**
 * L'aperçu est rendu dans un iframe pour éviter les conflits de styles
 * entre le CMS et le site public. Le contenu est injecté via un portail React.
 */
export function PreviewPane({ sections, locale = 'fr', restaurant }: PreviewPaneProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Injecter le style du site public dans l'iframe
  useEffect(() => {
    if (!iframeRef.current) return
    const doc = iframeRef.current.contentDocument
    if (!doc) return

    // Nettoyer et injecter le HTML de base
    doc.open()
    doc.write(`<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="/index.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; }
  </style>
</head>
<body>
  <div id="preview-root"></div>
</body>
</html>`)
    doc.close()

    // Trouver le conteneur pour le portail React
    const root = doc.getElementById('preview-root')
    if (root) {
      containerRef.current = root as HTMLDivElement
    }
  }, [locale])

  // Ne rendre que les sections visibles
  const visibleSections = sections.filter((s) => s.visible)

  return (
    <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 4 }}>
        Aperçu
      </div>
      <div style={{
        flex: 1, borderRadius: 12, overflow: 'hidden',
        border: '1px solid #e5e7eb', background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        <iframe
          ref={iframeRef}
          title="Aperçu du site"
          style={{ width: '100%', height: '100%', border: 'none' }}
          sandbox="allow-same-origin"
        />
        {containerRef.current && createPortal(
          visibleSections.map((section, i) => (
            <SectionRenderer
              key={section.id || `section-${i}`}
              section={section}
              locale={locale}
              restaurant={restaurant ?? DEFAULT_RESTAURANT}
              preview
            />
          )),
          containerRef.current,
        )}
      </div>
    </div>
  )
}

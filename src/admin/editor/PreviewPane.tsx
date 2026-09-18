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
import type { PageSection } from '@/cms/model/section'
import type { Locale } from '@/cms/model/i18n'
import type { ResolvedRestaurant } from '@/cms/repository/settings'

interface PreviewPaneProps {
  sections: PageSection[]
  locale?: Locale
  restaurant?: ResolvedRestaurant
}

/**
 * L'aperçu est rendu dans un iframe pour éviter les conflits de styles
 * entre le CMS et le site public. Le contenu est injecté en HTML
 * via `srcdoc`.
 *
 * Alternative : un rendu React direct (plus rapide, mais risque de
 * fuites de styles). On garde l'iframe pour la sécurité.
 */
export function PreviewPane({ sections, locale = 'fr', restaurant }: PreviewPaneProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (!iframeRef.current) return

    // Construire le HTML des sections
    const sectionsHtml = sections
      .filter((s) => s.visible)
      .map((s) => {
        const content = JSON.stringify(s.content)
        return `<div data-section="${s.type}" data-anchor="${s.anchor ?? ''}" data-content='${content.replace(/'/g, "&#39;")}'>[${s.type}]</div>`
      })
      .join('\n')

    const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; }
    [data-section] { padding: 32px 24px; border-bottom: 1px dashed #e5e7eb; }
    [data-section]::before {
      content: attr(data-section);
      display: inline-block; padding: 2px 8px; margin-bottom: 8px;
      background: #f3f4f6; border-radius: 4px; font-size: 11px; color: #6b7280;
      text-transform: uppercase; letter-spacing: 0.05em;
    }
  </style>
</head>
<body>
  ${sectionsHtml || '<div style="padding: 48px; text-align: center; color: #9ca3af;">Aucune section à afficher.</div>'}
</body>
</html>`

    iframeRef.current.srcdoc = html
  }, [sections, locale])

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
      </div>
    </div>
  )
}

/**
 * Greatlife — CMS : colonne Aperçu
 * ==================================
 * Rendu temps réel du site public dans la colonne centrale.
 * Utilise le renderer isomorphe : même code que le site public,
 * mais alimenté par les données locales de l'éditeur.
 *
 * Le rendu est en iframe pour isoler les styles du CMS de ceux du site public.
 */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { PageSection } from '@/cms/model/section'
import type { Locale } from '@/cms/model/i18n'
import type { ResolvedRestaurant } from '@/cms/repository/settings'
import { PageRenderer } from '@/cms/renderer/PageRenderer'
import type { PageLayout } from '@/cms/model/page-layout'
import { CartProvider } from '@/contexts/CartContext'
import { useSite } from '@/contexts/SiteContext'

interface PreviewPaneProps {
  sections: PageSection[]
  locale?: Locale
  restaurant?: ResolvedRestaurant
  layout?: PageLayout
}

/**
 * Réglages de repli pour la prévisualisation.
 *
 * ⚠️ AUCUNE COORDONNÉE INVENTÉE (revue du 2026-09-20, I-4).
 * Cette constante portait les valeurs de démonstration — « Conakry, Guinée »,
 * « +224 000 00 00 00 », « contact@greatlife.gn ». Comme `PageEditor` appelait
 * `PreviewPane` SANS `restaurant`, c'est ce repli qui s'appliquait.
 *
 * CE QUI ÉTAIT FAUX DANS MA PREMIÈRE DESCRIPTION (revue du 2026-09-20, I-1)
 * J'ai écrit que l'aperçu montrait « un numéro de téléphone qui n'était pas le
 * sien ». C'est inexact : ces quatre valeurs étaient IDENTIQUES aux valeurs
 * réelles de `site_content.restaurant` — l'aperçu tombait juste, par coïncidence.
 * Le défaut réel, et il est plus grave qu'un affichage faux, était que l'aperçu
 * était DÉCONNECTÉ des réglages : dès que le restaurateur aurait mis son vrai
 * numéro, l'aperçu aurait continué d'afficher l'ancien — c'est-à-dire qu'il
 * aurait cessé de dire la vérité au moment précis où cela compte.
 *
 * `PageEditor` fournit désormais les réglages réels. Tant qu'ils ne sont pas
 * arrivés, l'aperçu n'affiche AUCUNE coordonnée — pas une fausse.
 * `name` et `currency` sont conservés : ce ne sont pas des coordonnées, et la
 * mise en page en a besoin.
 */
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
}

function PreviewShell({ children }: { children: React.ReactNode }) {
  const { rootStyle } = useSite()
  return <div style={{ ...rootStyle, minHeight: '100%' }}>{children}</div>
}

/**
 * L'aperçu est rendu dans un iframe pour éviter les conflits de styles
 * entre le CMS et le site public. Le contenu est injecté via un portail React.
 */
export function PreviewPane({ sections, locale = 'fr', restaurant, layout }: PreviewPaneProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [ready, setReady] = useState(0)

  useEffect(() => {
    if (!iframeRef.current) return
    const doc = iframeRef.current.contentDocument
    if (!doc) return

    const feuilles = [...document.querySelectorAll('link[rel="stylesheet"]')]
      .map((n) => (n as HTMLLinkElement).href)
      .filter(Boolean)
    const polices = (document.getElementById('greatlife-fonts') as HTMLLinkElement | null)?.href

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
    html, body, #preview-root { min-height: 100%; }
  </style>
</head>
<body>
  <div id="preview-root"></div>
</body>
</html>`)
    doc.close()

    const root = doc.getElementById('preview-root')
    if (root) {
      containerRef.current = root as HTMLDivElement
      setReady((n) => n + 1)
    }
  }, [locale])

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
          allow="autoplay; fullscreen"
          style={{ width: '100%', height: '100%', border: 'none' }}
          sandbox="allow-same-origin allow-scripts"
        />
        {ready > 0 && containerRef.current && createPortal(
          <PreviewShell>
            <CartProvider>
              <PageRenderer
                page={{
                  id: 'preview',
                  slug: '',
                  title: {},
                  status: 'draft',
                  sortOrder: 0,
                  seo: {},
                  layout: layout ?? 'single_column',
                  publishedAt: null,
                  createdAt: '',
                  updatedAt: '',
                  updatedBy: null,
                }}
                sections={visibleSections}
                locale={locale}
                restaurant={restaurant ?? RESTAURANT_ABSENT}
                preview
                layout={layout}
              />
            </CartProvider>
          </PreviewShell>,
          containerRef.current,
        )}
      </div>
    </div>
  )
}

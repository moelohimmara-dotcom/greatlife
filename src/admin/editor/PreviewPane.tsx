/**
 * Greatlife — CMS : colonne Aperçu
 * ==================================
 * Rendu temps réel dans une iframe, isolée des styles de la console.
 *
 * Bureau / Téléphone : l'iframe a la LARGEUR RÉELLE de l'appareil
 * (1200 px / 390 px), puis on réduit à l'échelle pour tenir dans la colonne.
 * Les mises en page (grille, écran partagé) réagissent donc comme sur le
 * site public — plus comme une colonne trop étroite qui les repliait toutes.
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
import { anneauFocus, CIBLE } from './chrome'

type CadreApercu = 'bureau' | 'telephone'

const LARGEUR_CADRE: Record<CadreApercu, number> = {
  bureau: 1200,
  telephone: 390,
}

interface PreviewPaneProps {
  sections: PageSection[]
  locale?: Locale
  restaurant?: ResolvedRestaurant
  layout?: PageLayout
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
}

function PreviewShell({ children }: { children: React.ReactNode }) {
  const { rootStyle } = useSite()
  return <div style={{ ...rootStyle, minHeight: '100%' }}>{children}</div>
}

export function PreviewPane({ sections, locale = 'fr', restaurant, layout }: PreviewPaneProps) {
  const { theme: t } = useSite()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const sceneRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(0)
  const [cadre, setCadre] = useState<CadreApercu>('bureau')
  const [scene, setScene] = useState({ w: 0, h: 0 })

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

  useEffect(() => {
    const el = sceneRef.current
    if (!el) return
    const mesurer = () => setScene({ w: el.clientWidth, h: el.clientHeight })
    mesurer()
    const ro = new ResizeObserver(mesurer)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const visibleSections = sections.filter((s) => s.visible)
  const largeur = LARGEUR_CADRE[cadre]
  const scale = scene.w > 0 ? Math.min(1, (scene.w - 16) / largeur) : 1
  const hauteurIframe = scene.h > 0 ? Math.max(scene.h / scale, 1) : 800

  return (
    <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: t.heading, paddingLeft: 4 }}>
          Aperçu
        </div>
        <div role="group" aria-label="Cadre de l’aperçu" style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {([
            { id: 'bureau' as const, label: 'Bureau' },
            { id: 'telephone' as const, label: 'Téléphone' },
          ]).map((item) => {
            const actif = cadre === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setCadre(item.id)}
                aria-pressed={actif}
                style={{
                  minHeight: CIBLE, minWidth: CIBLE, padding: '10px 16px', borderRadius: 10,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${actif ? t.primary : t.shadow}`,
                  background: actif ? t.primary : t.surface,
                  color: actif ? '#fff' : t.text,
                }}
                {...anneauFocus(t)}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </div>
      <div
        ref={sceneRef}
        style={{
          flex: 1, borderRadius: 12, overflow: 'hidden',
          border: `1px solid ${t.shadow}`, background: t.surfaceAlt,
          position: 'relative',
        }}
      >
        <iframe
          ref={iframeRef}
          title={cadre === 'telephone' ? 'Aperçu du site sur téléphone' : 'Aperçu du site sur bureau'}
          allow="autoplay; fullscreen"
          sandbox="allow-same-origin allow-scripts"
          style={{
            position: 'absolute',
            left: '50%',
            top: 8,
            width: largeur,
            height: hauteurIframe,
            marginLeft: -largeur / 2,
            border: cadre === 'telephone' ? `8px solid ${t.primaryDark}` : `1px solid ${t.shadow}`,
            borderRadius: cadre === 'telephone' ? 20 : 4,
            background: t.surface,
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
          }}
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

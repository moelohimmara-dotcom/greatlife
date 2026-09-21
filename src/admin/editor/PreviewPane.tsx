/**
 * Greatlife — CMS : colonne Aperçu
 * ==================================
 * Rendu temps réel dans une iframe, isolée des styles de la console.
 *
 * Bureau / Téléphone : l'iframe a la LARGEUR RÉELLE de l'appareil
 * (1200 px / 390 px), puis on réduit à l'échelle pour tenir dans la colonne.
 * Les mises en page (grille, écran partagé) réagissent donc comme sur le
 * site public.
 *
 * À chaque changement de mise en page, on ramène le défilement en haut :
 * c'est là que le choix se voit (bannière). Rester sur « Notre histoire »
 * donnait l'impression que rien ne bougeait.
 */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { PageSection } from '@/cms/model/section'
import type { Locale } from '@/cms/model/i18n'
import type { ResolvedRestaurant } from '@/cms/repository/settings'
import { PageRenderer } from '@/cms/renderer/PageRenderer'
import { pageLayoutLabel, type PageLayout } from '@/cms/model/page-layout'
import { CartProvider } from '@/contexts/CartContext'
import { Footer } from '@/sections/Footer'
import { useSite } from '@/contexts/SiteContext'
import { Bouton } from './chrome'
import { echelleCadreApercu, hauteurVerreApercu } from './preview-geometry'

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
  return <div style={rootStyle}>{children}</div>
}

function remplirIframe(iframe: HTMLIFrameElement, locale: string): HTMLDivElement | null {
  const doc = iframe.contentDocument
  if (!doc) return null

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
    html, body {
      background: var(--c-cream, #F5EFE6);
      min-height: 100%;
    }
    html { overflow-y: auto; }
  </style>
</head>
<body>
  <div id="preview-root"></div>
</body>
</html>`)
  doc.close()
  return doc.getElementById('preview-root') as HTMLDivElement | null
}

export function PreviewPane({ sections, locale = 'fr', restaurant, layout }: PreviewPaneProps) {
  const { theme: t } = useSite()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const sceneRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(0)
  const [cadre, setCadre] = useState<CadreApercu>('bureau')
  const [scene, setScene] = useState({ w: 0, h: 0 })
  const miseEnPage = layout ?? 'single_column'

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const root = remplirIframe(iframe, locale)
    if (root) {
      containerRef.current = root
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

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument
    if (!doc) return
    doc.documentElement.scrollTop = 0
    doc.body.scrollTop = 0
  }, [miseEnPage, cadre, locale, ready])

  const visibleSections = sections.filter((s) => s.visible)
  const largeur = LARGEUR_CADRE[cadre]
  const scale = echelleCadreApercu(scene.w, largeur)
  const hauteurIframe = hauteurVerreApercu(scene.h, scale)

  return (
    <div style={{ padding: 16, flex: 1, minHeight: 0, height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: t.heading, paddingLeft: 4 }}>
          Aperçu
        </div>
        <div style={{ fontSize: 12, color: t.muted }}>
          {pageLayoutLabel(miseEnPage)}
        </div>
        <div role="group" aria-label="Cadre de l’aperçu" style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
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
      </div>
      <div
        ref={sceneRef}
        style={{
          flex: 1, minHeight: 0, borderRadius: 12, overflow: 'hidden',
          border: `1px solid ${t.shadow}`, background: t.bg,
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
            top: 0,
            width: largeur,
            height: hauteurIframe,
            marginLeft: -largeur / 2,
            border: cadre === 'telephone' ? `8px solid ${t.primaryDark}` : `1px solid ${t.shadow}`,
            borderRadius: cadre === 'telephone' ? 20 : 4,
            background: t.bg,
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
          }}
        />
        {ready > 0 && containerRef.current && createPortal(
          <PreviewShell>
            <CartProvider>
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
                sections={visibleSections}
                locale={locale}
                restaurant={restaurant ?? RESTAURANT_ABSENT}
                preview
                layout={miseEnPage}
                pied={<Footer restaurant={restaurant ?? RESTAURANT_ABSENT} />}
              />
            </CartProvider>
          </PreviewShell>,
          containerRef.current,
        )}
      </div>
    </div>
  )
}

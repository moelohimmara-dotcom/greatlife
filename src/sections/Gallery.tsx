import { useSite } from '@/contexts/SiteContext'
import { Reveal } from '@/components/ui/Reveal'
import { SectionHead } from '@/components/ui/SectionHead'
import type { SectionComponentProps } from '@/cms/renderer'
import { cmsList, cmsText } from '@/cms/renderer/compat'
import { normaliserDisposition } from '@/cms/renderer/disposition'
import { InlineHtml } from '@/cms/renderer/InlineHtml'
import { coalesceAlt, findMediaByUrl, resolveMediaAlt } from '@/lib/mediaAlt'

interface GalleryItem {
  media?: string
  caption?: string
}

const DISPOSITIONS = ['grid', 'mosaic', 'carousel'] as const

export function Gallery({ content: cms, variant, preview }: Partial<SectionComponentProps> = {}) {
  const { theme: t, media } = useSite()
  const items = (cmsList<GalleryItem>(cms, 'items') ?? []).filter((it) => typeof it.media === 'string' && it.media.trim() !== '')
  if (items.length === 0) {
    if (!preview) return null
    return (
      <section className="section-pad" style={{ padding: '72px 24px', maxWidth: 900, margin: '0 auto' }}>
        <p style={{ margin: 0, fontSize: 14, color: t.muted, textAlign: 'center' }}>
          Galerie vide : ajoutez des photos dans la colonne Modifier.
        </p>
      </section>
    )
  }

  const title = cmsText(cms, 'title') ?? 'Galerie'
  const sub = cmsText(cms, 'subtitle')
  const disposition = normaliserDisposition(variant, DISPOSITIONS, 'grid')

  const cell = (it: GalleryItem, i: number, tall?: boolean) => {
    const url = (it.media ?? '').trim()
    const asset = findMediaByUrl(media, url)
    const alt = coalesceAlt(resolveMediaAlt(asset), it.caption, `Photo ${i + 1}`)
    return (
      <Reveal key={`${url}-${i}`} delay={(i % 4) * 0.05}>
        <figure style={{ margin: 0, borderRadius: 18, overflow: 'hidden', background: t.surfaceAlt, height: '100%' }}>
          <div
            role="img"
            aria-label={alt}
            style={{
              width: '100%',
              aspectRatio: tall ? '3/4' : '4/3',
              background: `url(${url}) center/cover`,
              minHeight: tall ? 220 : 160,
            }}
          />
          {it.caption ? (
            <figcaption style={{ padding: '12px 14px', fontSize: 13, color: t.muted, lineHeight: 1.45 }}>
              <InlineHtml as="span" html={it.caption} />
            </figcaption>
          ) : null}
        </figure>
      </Reveal>
    )
  }

  if (disposition === 'carousel') {
    return (
      <section className="section-pad" data-disposition="carousel" style={{ padding: '100px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <Reveal>
          <SectionHead title={title} sub={sub} align="center" preview={preview} />
        </Reveal>
        <div
          style={{
            display: 'flex',
            gap: 16,
            overflowX: 'auto',
            paddingBottom: 8,
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {items.map((it, i) => (
            <div key={i} style={{ flex: '0 0 min(78%, 340px)', scrollSnapAlign: 'start' }}>
              {cell(it, i)}
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (disposition === 'mosaic') {
    return (
      <section className="section-pad" data-disposition="mosaic" style={{ padding: '100px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <Reveal>
          <SectionHead title={title} sub={sub} align="center" preview={preview} />
        </Reveal>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gridAutoRows: 'minmax(140px, auto)',
            gap: 12,
          }}
        >
          {items.map((it, i) => (
            <div key={i} style={{ gridRow: i % 5 === 0 ? 'span 2' : undefined }}>
              {cell(it, i, i % 5 === 0)}
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="section-pad" data-disposition="grid" style={{ padding: '100px 24px', maxWidth: 1200, margin: '0 auto' }}>
      <Reveal>
        <SectionHead title={title} sub={sub} align="center" preview={preview} />
      </Reveal>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
        {items.map((it, i) => cell(it, i))}
      </div>
    </section>
  )
}

import { useSite } from '@/contexts/SiteContext'
import { softShadow } from '@/components/ui/shadows'
import { Reveal } from '@/components/ui/Reveal'
import { SectionHead } from '@/components/ui/SectionHead'
import type { SectionComponentProps } from '@/cms/renderer'
import { cmsText } from '@/cms/renderer/compat'
import { normaliserDisposition } from '@/cms/renderer/disposition'
import { InlineHtml } from '@/cms/renderer/InlineHtml'
import { cmsSlotAttrs } from '@/cms/model/subblocks'
import { coalesceAlt, findMediaByUrl, resolveMediaAlt } from '@/lib/mediaAlt'

const DISPOSITIONS = ['image_left', 'image_right'] as const

export function ImageText({ content: cms, variant, preview }: Partial<SectionComponentProps> = {}) {
  const { theme: t, media } = useSite()
  const title = cmsText(cms, 'title')
  const body = cmsText(cms, 'body')
  const image = cmsText(cms, 'image')
  const asset = image ? findMediaByUrl(media, image) : undefined
  const imageAlt = coalesceAlt(cmsText(cms, 'imageAlt'), resolveMediaAlt(asset), title) || undefined

  if (!title && !body && !image) {
    if (!preview) return null
    return (
      <section className="section-pad" style={{ padding: '48px 24px', maxWidth: 900, margin: '0 auto' }}>
        <p style={{ margin: 0, fontSize: 14, color: t.muted, textAlign: 'center' }}>
          Bloc image et texte vide : ajoutez une photo ou un texte dans Modifier.
        </p>
      </section>
    )
  }

  const disposition = normaliserDisposition(variant, DISPOSITIONS, 'image_left')
  const imageADroite = disposition === 'image_right'

  const mediaBlock = (
    <Reveal>
      <div
        style={{
          aspectRatio: '4/3',
          borderRadius: 24,
          background: image
            ? `url(${image}) center/cover`
            : `linear-gradient(160deg, ${t.primary}22, ${t.primary}08)`,
          boxShadow: softShadow(t),
          minHeight: 220,
        }}
        {...(image && imageAlt ? { role: 'img', 'aria-label': imageAlt } : { 'aria-hidden': true })}
      />
    </Reveal>
  )

  const texte = (
    <Reveal delay={0.08}>
      {title ? <SectionHead title={title} preview={preview} /> : null}
      {body ? (
        <InlineHtml
          as="p"
          html={body}
          {...cmsSlotAttrs(preview, 'body')}
          style={{ fontSize: 16, lineHeight: 1.75, color: t.text, margin: 0 }}
        />
      ) : null}
    </Reveal>
  )

  return (
    <section
      className="section-pad"
      data-disposition={disposition}
      style={{ padding: '96px 24px', maxWidth: 1100, margin: '0 auto' }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gap: 48,
          alignItems: 'center',
        }}
        className="image-text-grid"
      >
        {imageADroite ? texte : mediaBlock}
        {imageADroite ? mediaBlock : texte}
      </div>
    </section>
  )
}

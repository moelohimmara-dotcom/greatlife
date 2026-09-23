import { useSite } from '@/contexts/SiteContext'
import { Reveal } from '@/components/ui/Reveal'
import { SectionHead } from '@/components/ui/SectionHead'
import type { SectionComponentProps } from '@/cms/renderer'
import { cmsText } from '@/cms/renderer/compat'
import { normaliserDisposition } from '@/cms/renderer/disposition'
import { InlineHtml } from '@/cms/renderer/InlineHtml'
import { cmsSlotAttrs } from '@/cms/model/subblocks'

const DISPOSITIONS = ['one_column', 'two_columns'] as const

export function TextBlock({ content: cms, variant, preview }: Partial<SectionComponentProps> = {}) {
  const { theme: t } = useSite()
  const title = cmsText(cms, 'title')
  const body = cmsText(cms, 'body')
  if (!title && !body) {
    if (!preview) return null
    return (
      <section className="section-pad" style={{ padding: '48px 24px', maxWidth: 800, margin: '0 auto' }}>
        <p style={{ margin: 0, fontSize: 14, color: t.muted, textAlign: 'center' }}>
          Bloc texte vide : saisissez un titre ou un texte dans Modifier.
        </p>
      </section>
    )
  }

  const disposition = normaliserDisposition(variant, DISPOSITIONS, 'one_column')
  const bodyStyle = { fontSize: 17, lineHeight: 1.75, color: t.text, margin: 0 as const }

  return (
    <section
      className="section-pad"
      data-disposition={disposition}
      style={{ padding: '88px 24px', maxWidth: disposition === 'two_columns' ? 1100 : 760, margin: '0 auto' }}
    >
      <Reveal>
        {title ? <SectionHead title={title} preview={preview} /> : null}
        {body ? (
          disposition === 'two_columns' ? (
            <div
              style={{
                columns: '2 280px',
                columnGap: 40,
              }}
            >
              <InlineHtml as="p" html={body} {...cmsSlotAttrs(preview, 'body')} style={bodyStyle} />
            </div>
          ) : (
            <InlineHtml as="p" html={body} {...cmsSlotAttrs(preview, 'body')} style={bodyStyle} />
          )
        ) : null}
      </Reveal>
    </section>
  )
}

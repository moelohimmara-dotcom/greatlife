import { useSite } from '@/contexts/SiteContext'
import { Reveal } from '@/components/ui/Reveal'
import { SectionHead } from '@/components/ui/SectionHead'
import type { SectionComponentProps } from '@/cms/renderer'
import { cmsText } from '@/cms/renderer/compat'
import { InlineHtml } from '@/cms/renderer/InlineHtml'
import { cmsSlotAttrs } from '@/cms/model/subblocks'
import { traduire } from '@/i18n/ui'

const tr = traduire()

/** Contenu libre — même rendu qu’un texte une colonne (registre `rich_text`). */
export function RichText({ content: cms, preview }: Partial<SectionComponentProps> = {}) {
  const { theme: t } = useSite()
  const title = cmsText(cms, 'title')
  const body = cmsText(cms, 'body')

  if (!title && !body) {
    if (!preview) return null
    return (
      <section className="section-pad" style={{ padding: '48px 24px', maxWidth: 800, margin: '0 auto' }}>
        <p style={{ margin: 0, fontSize: 14, color: t.muted, textAlign: 'center' }}>
          {tr('richText.empty')}
        </p>
      </section>
    )
  }

  return (
    <section className="section-pad" style={{ padding: '80px 24px', maxWidth: 760, margin: '0 auto' }}>
      <Reveal>
        {title ? <SectionHead title={title} preview={preview} /> : null}
        {body ? (
          <InlineHtml
            as="div"
            html={body}
            {...cmsSlotAttrs(preview, 'body')}
            style={{ fontSize: 16, lineHeight: 1.8, color: t.text }}
          />
        ) : null}
      </Reveal>
    </section>
  )
}

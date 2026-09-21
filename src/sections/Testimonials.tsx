import { useSite } from '@/contexts/SiteContext'
import { OrganicCard } from '@/components/ui/OrganicCard'
import { Reveal } from '@/components/ui/Reveal'
import { SectionHead } from '@/components/ui/SectionHead'
import type { SectionComponentProps } from '@/cms/renderer'
import { cmsList, cmsText, pick } from '@/cms/renderer/compat'
import { normaliserDisposition } from '@/cms/renderer/disposition'
import { InlineHtml } from '@/cms/renderer/InlineHtml'

interface TestimonialCms {
  name?: string
  text?: string
}

const DISPOSITIONS = ['cards', 'quotes'] as const

export function Testimonials({ content: cms, variant, preview }: Partial<SectionComponentProps> = {}) {
  const { theme: t, content: legacy } = useSite()

  // Le contenu du CMS nomme le client `name` ; le modèle historique l'appelle
  // `author`. On normalise ici pour n'avoir qu'une seule forme à afficher.
  const source: { author: string; text: string }[] = pick(
    cmsList<TestimonialCms>(cms, 'items')?.map((tm) => ({
      author: tm.name ?? '',
      text: tm.text ?? '',
    })),
    legacy.testimonials.map((tm) => ({ author: tm.author, text: tm.text })),
  )

  // Un bloc d'avis vide ne s'affiche pas — la visibilité est aussi gérée en base.
  if (source.length === 0) return null

  const title = pick(cmsText(cms, 'title'), 'Ils ont goûté Greatlife')
  const sub = pick(cmsText(cms, 'subtitle'), 'Ce que disent nos clients.')
  const disposition = normaliserDisposition(variant, DISPOSITIONS, 'cards')

  if (disposition === 'quotes') {
    return (
      <section className="section-pad" data-disposition="quotes" style={{ padding: '100px 24px', maxWidth: '720px', margin: '0 auto' }}>
        <Reveal>
          <SectionHead title={title} sub={sub} align="center" preview={preview} />
        </Reveal>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '36px', marginTop: '8px' }}>
          {source.map((tm, i) => (
            <Reveal key={i} delay={(i % 3) * 0.06}>
              <blockquote style={{ margin: 0, textAlign: 'center' }}>
                <p style={{ fontSize: '18px', color: t.text, lineHeight: 1.7, margin: 0, fontFamily: 'var(--font-heading, var(--f-heading))', fontStyle: 'italic' }}>« <InlineHtml as="span" html={tm.text} /> »</p>
                <footer style={{ marginTop: 14, fontSize: 14, fontWeight: 600, color: t.heading }}>— {tm.author}</footer>
              </blockquote>
            </Reveal>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="section-pad" style={{ padding: '100px 24px', maxWidth: '1100px', margin: '0 auto' }}>
      <Reveal>
        <SectionHead title={title} sub={sub} align="center" preview={preview} />
      </Reveal>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: '20px', marginTop: '8px' }}>
        {source.map((tm, i) => (
          <Reveal key={i} delay={(i % 3) * 0.06}>
            <OrganicCard hover style={{ padding: '28px' }}>
              <div style={{ fontSize: 28, lineHeight: 1, color: t.accent, marginBottom: 12, fontFamily: 'var(--font-heading, var(--f-heading))' }}>“</div>
              <p style={{ fontSize: '14.5px', color: t.text, lineHeight: 1.6, margin: 0 }}><InlineHtml as="span" html={tm.text} /></p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${t.primary}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: t.primary }}>{tm.author.charAt(0).toUpperCase()}</div>
                <span style={{ fontSize: 14, fontWeight: 600, color: t.heading }}>{tm.author}</span>
              </div>
            </OrganicCard>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

import { useSite, useFirstMediaAsset } from '@/contexts/SiteContext'
import { OrganicCard } from '@/components/ui/OrganicCard'
import { Reveal } from '@/components/ui/Reveal'
import { SectionHead } from '@/components/ui/SectionHead'
import { FoodIcon } from '@/lib/icons/FoodIcon'
import { productPhotoCandidates } from '@/lib/productPhotoSlot'
import { resolveMediaAlt } from '@/lib/mediaAlt'
import type { MenuItem } from '@/data/menu'
import type { SectionComponentProps } from '@/cms/renderer'
import { cmsList, cmsText, pick } from '@/cms/renderer/compat'
import { normaliserDisposition } from '@/cms/renderer/disposition'

interface FeaturedRef {
  ref?: string
}

const DISPOSITIONS = ['grid', 'carousel'] as const

function FeaturedCard({ item }: { item: MenuItem }) {
  const { theme: t } = useSite()
  const prodAsset = useFirstMediaAsset(productPhotoCandidates(item))
  const prodImg = prodAsset?.url
  const prodAlt = resolveMediaAlt(prodAsset, item.name)

  return (
    <OrganicCard hover style={{ padding: 0, overflow: 'hidden', height: '100%' }}>
      <div
        style={{
          height: 140,
          background: prodImg
            ? `url(${prodImg}) center/cover`
            : `linear-gradient(135deg, ${t.primary}12, ${t.primary}06)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        {...(prodImg && prodAlt ? { role: 'img', 'aria-label': prodAlt } : {})}
      >
        {!prodImg ? <FoodIcon cat={item.cat} size={48} color={t.heading} /> : null}
      </div>
      <div style={{ padding: '16px 16px 20px' }}>
        <h3
          style={{
            fontFamily: 'var(--font-heading, var(--f-heading))',
            color: t.heading,
            fontSize: 18,
            fontWeight: 700,
            margin: '0 0 6px',
            letterSpacing: '-0.02em',
          }}
        >
          {item.name}
        </h3>
        <p style={{ fontSize: 14, color: t.muted, lineHeight: 1.5, margin: '0 0 8px' }}>{item.desc}</p>
        <span style={{ fontFamily: 'var(--font-heading, var(--f-heading))', fontWeight: 700, color: t.accent, fontSize: 16 }}>
          {item.price}
          <span style={{ fontSize: 11, fontWeight: 500, color: t.muted, marginLeft: 4 }}>FG</span>
        </span>
      </div>
    </OrganicCard>
  )
}

/**
 * Plats choisis dans la carte (TDR §16) — références uniquement, jamais de copie de prix.
 * `ref` accepte l’id stable du plat ou son nom (repli tant que l’éditeur n’a pas de sélecteur dédié).
 */
export function MenuFeatured({ content: cms, data, variant, preview }: Partial<SectionComponentProps> = {}) {
  const { menu: legacyMenu, theme: t } = useSite()
  const menu = pick(data?.menu as MenuItem[] | undefined, legacyMenu)
  const refs = (cmsList<FeaturedRef>(cms, 'items') ?? [])
    .map((it) => (it.ref ?? '').trim())
    .filter(Boolean)

  const byRef = (ref: string): MenuItem | undefined =>
    menu.find((m) => m.id === ref || m.name === ref)

  const featured = refs.map(byRef).filter((m): m is MenuItem => Boolean(m))

  if (featured.length === 0) {
    if (!preview) return null
    return (
      <section className="section-pad" style={{ padding: '64px 24px', maxWidth: 900, margin: '0 auto' }}>
        <p style={{ margin: 0, fontSize: 14, color: t.muted, textAlign: 'center' }}>
          Plats à la une : indiquez l’identifiant ou le nom de plats de la carte dans Modifier.
        </p>
      </section>
    )
  }

  const title = cmsText(cms, 'title') ?? 'À la une'
  const sub = cmsText(cms, 'subtitle')
  const disposition = normaliserDisposition(variant, DISPOSITIONS, 'grid')

  if (disposition === 'carousel') {
    return (
      <section className="section-pad" data-disposition="carousel" style={{ padding: '96px 24px', maxWidth: 1200, margin: '0 auto' }}>
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
          {featured.map((item, i) => (
            <div key={item.id ?? item.name} style={{ flex: '0 0 min(78%, 300px)', scrollSnapAlign: 'start' }}>
              <Reveal delay={(i % 4) * 0.05}>
                <FeaturedCard item={item} />
              </Reveal>
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="section-pad" data-disposition="grid" style={{ padding: '96px 24px', maxWidth: 1200, margin: '0 auto' }}>
      <Reveal>
        <SectionHead title={title} sub={sub} align="center" preview={preview} />
      </Reveal>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {featured.map((item, i) => (
          <Reveal key={item.id ?? item.name} delay={(i % 4) * 0.05}>
            <FeaturedCard item={item} />
          </Reveal>
        ))}
      </div>
    </section>
  )
}

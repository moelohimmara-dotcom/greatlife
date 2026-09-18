import { useSite, useMedia } from '@/contexts/SiteContext'
import { OrganicCard } from '@/components/ui/OrganicCard'
import { Reveal } from '@/components/ui/Reveal'
import { SectionHead } from '@/components/ui/SectionHead'
import type { SectionComponentProps } from '@/cms/renderer'
import { cmsList, cmsText, pick } from '@/cms/renderer/compat'

interface TeamMember {
  name: string
  role?: string
  desc?: string
}

export function Team({ content: cms }: Partial<SectionComponentProps> = {}) {
  const { theme: t, content: legacy } = useSite()
  const teamImg1 = useMedia('equipe-1')
  const teamImg2 = useMedia('equipe-2')
  const teamImg3 = useMedia('equipe-3')
  const teamImg4 = useMedia('equipe-4')
  const teamImgs = [teamImg1, teamImg2, teamImg3, teamImg4]
  const palette = [t.primary, t.accent, t.gold, t.primary]

  // Bloc piloté par le CMS si un contenu est fourni, sinon données historiques.
  const source: TeamMember[] = pick(cmsList<TeamMember>(cms, 'members'), legacy.team)
  const team = source.map((m, i) => ({ ...m, color: palette[i % palette.length] }))

  const title = pick(cmsText(cms, 'title'), 'Les visages de Greatlife')
  const sub = pick(
    cmsText(cms, 'subtitle'),
    'Une équipe qui croit que manger bien devrait être simple, accessible et délicieux.',
  )

  return (
    <section className="section-pad" style={{ padding: '100px 24px', background: t.surfaceAlt }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <Reveal><SectionHead title={title} sub={sub} align="center" /></Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: '24px' }}>
          {team.map((m, i) => (
            <Reveal key={m.name} delay={(i % 4) * 0.06}>
              <OrganicCard hover style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{
                  height: '220px', position: 'relative',
                  background: teamImgs[i]
                    ? `url(${teamImgs[i]}) center/cover`
                    : `linear-gradient(160deg, ${m.color}25, ${m.color}08)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                }}>
                  {!teamImgs[i] && (
                    <span style={{ fontFamily: 'var(--f-heading)', fontSize: '80px', fontWeight: 700, color: m.color, opacity: 0.35, letterSpacing: '-0.04em' }} aria-hidden="true">{m.name.charAt(0)}</span>
                  )}
                  <svg viewBox="0 0 260 40" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%' }} preserveAspectRatio="none" aria-hidden="true">
                    <path d="M 0 20 Q 130 0 260 20 L 260 40 L 0 40 Z" fill={t.surface} />
                  </svg>
                </div>
                <div style={{ padding: '20px 22px 24px' }}>
                  <h4 style={{ fontFamily: 'var(--f-heading)', color: t.heading, fontSize: '18px', fontWeight: 700, margin: '0 0 3px', letterSpacing: '-0.02em' }}>{m.name}</h4>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: m.color, marginBottom: '10px' }}>{m.role}</div>
                  <p style={{ fontSize: '13.5px', color: t.muted, lineHeight: 1.55, margin: 0 }}>{m.desc}</p>
                </div>
              </OrganicCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

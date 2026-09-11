import { useSite, useMedia } from '@/contexts/SiteContext'
import { OrganicCard } from '@/components/ui/OrganicCard'
import { Reveal } from '@/components/ui/Reveal'
import { SectionHead } from '@/components/ui/SectionHead'

export function Team() {
  const { theme: t } = useSite()
  const teamImg1 = useMedia('equipe-1')
  const teamImg2 = useMedia('equipe-2')
  const teamImg3 = useMedia('equipe-3')
  const teamImg4 = useMedia('equipe-4')
  const teamImgs = [teamImg1, teamImg2, teamImg3, teamImg4]
  const team = [
    { name: 'Mister Marcket', role: 'Fondateur & Propriétaire', desc: 'Visionnaire derrière le concept de fast-food bio accessible. Passionné par la valorisation du terroir guinéen.', color: t.primary },
    { name: 'Aïssa Koné', role: 'Cheffe de cuisine', desc: 'Créatrice de nos recettes tropicales bio. Elle marie la street-food africaine et la cuisson saine avec brio.', color: t.accent },
    { name: 'Ibrahima Camara', role: 'Responsable qualité & fournisseurs', desc: 'Le gardien du circuit court. Il sélectionne chaque producteur partenaire de la Fouta-Djallon à Conakry.', color: t.gold },
    { name: 'Fatou Bérété', role: 'Hôte & Maître d\'hôtel', desc: 'Votre premier contact à Greatlife. Son accueil chaleureux donne le ton de l\'expérience gourmande.', color: t.primary },
  ]
  return (
    <section id="equipe" className="section-pad" style={{ padding: '100px 24px', background: t.surfaceAlt }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <Reveal><SectionHead title="Les visages de Greatlife" sub="Une équipe qui croit que manger bien devrait être simple, accessible et délicieux." align="center" /></Reveal>
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

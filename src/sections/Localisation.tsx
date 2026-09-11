import { useState } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { OrganicCard } from '@/components/ui/OrganicCard'
import { Reveal } from '@/components/ui/Reveal'
import { SectionHead } from '@/components/ui/SectionHead'
import { softShadow } from '@/components/ui/shadows'
import { Icon } from '@/lib/icons'

const MAP_QUERY = 'Kaloum, Conakry, Guinée'
const MAP_EMBED_SRC = `https://www.google.com/maps?q=${encodeURIComponent(MAP_QUERY + ' Jardin du 2 Octobre')}&z=15&output=embed`
const MAP_DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(MAP_QUERY)}`

export function Localisation() {
  const { theme: t } = useSite()
  const [mapError, setMapError] = useState(false)
  const directionsLabel = 'Itinéraire'
  return (
    <section id="loca" className="section-pad" style={{ padding: '100px 24px', maxWidth: '1000px', margin: '0 auto' }}>
      <Reveal>
        <SectionHead title="Nous trouver" sub="Kaloum, Conakry — au cœur de la ville." />
        <div className="loca-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <OrganicCard style={{ padding: '32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {[
                [Icon.pin(20, t.primary), 'Kaloum, Conakry — Guinée', 'Face au Jardin du 2 Octobre'],
                [Icon.clock(20, t.accent), 'Lun–Dim · 7h00 – 23h00', 'Service continu toute la journée'],
                [Icon.phone(20, t.gold), '+224 620 00 00 00', 'Appel & WhatsApp'],
                [Icon.mail(20, t.primary), 'contact@greatlife.gn', 'Réservations & commandes'],
              ].map(([ic, title, sub], i) => (
                <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${t.primary}0a`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{ic}</div>
                  <div>
                    <div style={{ fontWeight: 600, color: t.heading, fontSize: '15px' }}>{title}</div>
                    <div style={{ fontSize: '13px', color: t.muted, marginTop: '2px' }}>{sub}</div>
                  </div>
                </div>
              ))}
              <a href={MAP_DIRECTIONS_URL} target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  marginTop: '4px', padding: '12px 24px', borderRadius: '100px', fontSize: '14.5px', fontWeight: 600,
                  background: t.primary, color: '#fff', textDecoration: 'none', cursor: 'pointer',
                  boxShadow: `0 4px 16px ${t.shadowDeep}`, transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 6px 20px ${t.shadowDeep}` }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 4px 16px ${t.shadowDeep}` }}>
                {Icon.arrow(16)} {directionsLabel}
              </a>
            </div>
          </OrganicCard>
          <div style={{
            borderRadius: '20px', overflow: 'hidden', boxShadow: softShadow(t),
            background: t.surfaceAlt, position: 'relative', minHeight: '340px', border: `1px solid ${t.shadow}`,
          }}>
            {!mapError ? (
              <iframe
                title="Carte Greatlife — Kaloum, Conakry"
                src={MAP_EMBED_SRC}
                style={{ width: '100%', height: '100%', minHeight: '340px', border: 0, display: 'block' }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                onError={() => setMapError(true)}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '32px', textAlign: 'center', minHeight: '340px' }}>
                {Icon.pin(28, t.muted)}
                <div style={{ fontSize: '14px', color: t.muted, maxWidth: '280px' }}>
                  La carte interactive n'a pas pu charger. Retrouvez-nous sur Google Maps :
                </div>
                <a href={MAP_DIRECTIONS_URL} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '14px', fontWeight: 600, color: t.primary, textDecoration: 'none' }}>
                  Ouvrir l'itinéraire →
                </a>
              </div>
            )}
          </div>
        </div>
      </Reveal>
    </section>
  )
}

/**
 * Greatlife — Site public
 * ========================
 * Point d'entrée du rendu public. Utilise les données legacy par défaut.
 * Quand le flag CMS est activé, bascule sur les données de `page_sections`.
 *
 * La bascule est transparente pour le visiteur : le rendu est identique
 * (même composants, même thème). Seule la source des données change.
 */

import { useSite } from '@/contexts/SiteContext'
import { CartProvider } from '@/contexts/CartContext'
import { PublicNav } from '@/components/nav/PublicNav'
import { Hero } from './Hero'
import { Carte } from './Carte'
import { Story } from './Story'
import { Engagements } from './Engagements'
import { Team } from './Team'
import { Localisation } from './Localisation'
import { Contact } from './Contact'
import { Reservation } from './Reservation'
import { Blog } from './Blog'
import { Testimonials } from './Testimonials'
import { Footer } from './Footer'
import { OrderCart } from './OrderCart'
import { useCmsSections } from '@/cms/hooks/useCmsSections'
import { SectionRenderer } from '@/cms/renderer/SectionRenderer'
import type { PageSection } from '@/cms/model/section'

/**
 * Ancres héritées, utilisées uniquement par le chemin legacy (avant bascule CMS).
 * Les composants de section n'ont plus de `id` propre — l'ancre est portée par
 * l'enveloppe, que ce soit ici (legacy) ou dans `SectionRenderer` (CMS).
 *
 * Correspondance : chaque ancre doit correspondre à `anchor` dans `page_sections`
 * (migration 025). Si un lien du menu ne fonctionne pas, vérifier ici d'abord.
 */
const ANCHORS = {
  home: 'home',
  carte: 'carte',
  histoire: 'histoire',
  engagements: 'engagements',
  equipe: 'equipe',
  localisation: 'loca',
  contact: 'contact',
  reservation: 'reservation',
  temoignages: 'temoignages',
  blog: 'blog',
} as const

export function PublicSite() {
  const { visibility, rootStyle } = useSite()
  const { resolvedSections, loading, enabled } = useCmsSections()

  // --- Chemin CMS : les données viennent de page_sections ---
  if (enabled && !loading && resolvedSections.length > 0) {
    return (
      <CartProvider>
        <div style={rootStyle}>
          <PublicNav />
          {resolvedSections.map((section) => (
            <SectionRenderer
              key={section.id as string}
              section={section as unknown as PageSection}
              locale="fr"
              restaurant={{
                name: 'Greatlife',
                address: 'Conakry, Guinée',
                hours: 'Tous les jours · 11h00 — 23h00',
                phone: '+224 000 00 00 00',
                emailContact: 'contact@greatlife.gn',
                emailReservation: 'resa@greatlife.gn',
                slogan: 'Manger vite. Manger bio. Manger gourmand.',
                currency: 'FG',
                social: { facebook: '', whatsapp: '', instagram: '' },
              }}
            />
          ))}
          <Footer />
          <OrderCart />
        </div>
      </CartProvider>
    )
  }

  // --- Chemin legacy : les données viennent de site_content ---
  return (
    <CartProvider>
      <div style={rootStyle}>
        <PublicNav />
        {visibility.sections.home && <div id={ANCHORS.home}><Hero /></div>}
        {visibility.sections.carte && <div id={ANCHORS.carte}><Carte /></div>}
        {visibility.sections.histoire && <div id={ANCHORS.histoire}><Story /></div>}
        {visibility.sections.engagements && <div id={ANCHORS.engagements}><Engagements /></div>}
        {visibility.sections.equipe && <div id={ANCHORS.equipe}><Team /></div>}
        {visibility.sections.localisation && <div id={ANCHORS.localisation}><Localisation /></div>}
        {visibility.sections.contact && <div id={ANCHORS.contact}><Contact /></div>}
        <div id={ANCHORS.reservation}><Reservation /></div>
        {visibility.testimonials && <div id={ANCHORS.temoignages}><Testimonials /></div>}
        {visibility.sections.blog && <div id={ANCHORS.blog}><Blog /></div>}
        <Footer />
        <OrderCart />
      </div>
    </CartProvider>
  )
}

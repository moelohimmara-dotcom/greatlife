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

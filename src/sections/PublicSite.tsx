/**
 * Greatlife — Site public
 * ========================
 * Point d'entrée du rendu public.
 *
 * Le rendu suit le STATUT DE LA PAGE (TDR §22) :
 *
 *   page `draft`     → rendu historique (composants + `site_content`)
 *   page `published` → rendu CMS (`page_sections`, via le renderer)
 *
 * Aucun drapeau dans le navigateur : la décision vient de la base, et la RLS
 * garantit qu'un visiteur ne reçoit jamais une section non publiée (TDR §31).
 */

import { useEffect, useState } from 'react'
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
import { PageRenderer } from '@/cms/renderer/PageRenderer'
import { fetchSetting, resolveRestaurant, SETTING_KEYS, DEFAULT_RESTAURANT } from '@/cms/repository/settings'
import type { RestaurantSettings, ResolvedRestaurant } from '@/cms/repository/settings'

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
  const { resolvedSections, loading, enabled, page } = useCmsSections()
  const [restaurant, setRestaurant] = useState<ResolvedRestaurant>(
    () => resolveRestaurant(DEFAULT_RESTAURANT, 'fr'),
  )

  /*
    Les coordonnées viennent des réglages du restaurant (TDR §16 : une source
    unique). Elles ne doivent JAMAIS être recopiées en dur : une adresse figée
    dans le code ne suivrait pas une modification faite dans l'administration.
  */
  useEffect(() => {
    let cancelled = false
    fetchSetting(SETTING_KEYS.restaurant).then((res) => {
      if (cancelled) return
      if (res.ok && res.data) {
        setRestaurant(resolveRestaurant(res.data as unknown as RestaurantSettings, 'fr'))
      }
    }).catch(() => { /* repli sur les valeurs par défaut */ })
    return () => { cancelled = true }
  }, [])

  /*
    Tant qu'on ne sait pas si la page est publiée, peindre le rendu historique
    mentirait au visiteur (TDR §22 / flash observé).
  */
  if (loading) {
    return (
      <CartProvider>
        <div style={{ ...rootStyle, minHeight: '100vh' }} aria-busy="true">
          <PublicNav />
        </div>
      </CartProvider>
    )
  }

  // --- Chemin CMS : la page est publiée, on rend ses sections ---
  if (enabled && page && resolvedSections.length > 0) {
    return (
      <CartProvider>
        <div style={rootStyle}>
          <PublicNav />
          <PageRenderer
            page={page}
            sections={resolvedSections}
            locale="fr"
            restaurant={restaurant}
          />
          <Footer restaurant={restaurant} />
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
        <Footer restaurant={restaurant} />
        <OrderCart />
      </div>
    </CartProvider>
  )
}

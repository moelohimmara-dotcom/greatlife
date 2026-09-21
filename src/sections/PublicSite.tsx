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
 * Chrome (en-tête, pied, typo, logo, liens) : lu dans l’instantané publié,
 * jamais dans `site_content.restaurant` live (arbitrage 2026-09-21).
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
import { PageRenderer } from '@/cms/renderer/PageRenderer'
import { resolveRestaurant, DEFAULT_RESTAURANT } from '@/cms/repository/settings'
import { assurerPolicesChargees } from '@/config/fonts'
import { styleTypo, typoDepuisReglages, type TypoReglages } from '@/cms/model/sections/typo'
import { chromeDepuisReglages } from '@/cms/model/sections/chrome-presentation'
import { miseEnPageSurBanniere, normaliserPageLayout } from '@/cms/model/page-layout'
import type { ResolvedRestaurant } from '@/cms/repository/settings'
import type { SnapshotChrome } from '@/cms/model/publishing'
import type { LienChrome } from '@/cms/model/sections/site-chrome'
import { useEffect } from 'react'

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

/**
 * Archive sans chrome (avant gel 2026-09-21) → gabarit, jamais le JSON live.
 * `DEFAULT_RESTAURANT` vide ferait un en-tête sans nom : on garde la marque.
 */
function restaurantDepuisChrome(chrome: SnapshotChrome | null): ResolvedRestaurant {
  if (!chrome) {
    return resolveRestaurant({ ...DEFAULT_RESTAURANT, name: 'Greatlife' }, 'fr')
  }
  return resolveRestaurant(chrome.restaurant, 'fr')
}

function typoDepuisChrome(chrome: SnapshotChrome | null): TypoReglages | null {
  if (!chrome?.typography) return null
  return typoDepuisReglages({ typography: chrome.typography })
}

/**
 * `undefined` = gabarit (`PublicNav` / `Footer` : LIENS_*_DEFAUT).
 * Un tableau vide (même figé) veut dire « aucun lien » — ce n’est pas un oubli.
 */
function liensDepuisChrome(
  liens: SnapshotChrome['headerLinks'] | undefined,
): LienChrome[] | undefined {
  if (!liens) return undefined
  return liens.map((l) => ({
    id: l.id,
    label: l.label,
    target: l.target,
    visible: l.visible,
    isCta: l.isCta,
    source: 'settings' as const,
  }))
}

export function PublicSite() {
  const { visibility, rootStyle, content } = useSite()
  const { resolvedSections, loading, enabled, page, chrome } = useCmsSections()

  useEffect(() => {
    assurerPolicesChargees()
  }, [])

  const restaurantPublie = restaurantDepuisChrome(chrome)
  const typoPubliee = typoDepuisChrome(chrome)
  const presentationPubliee = chrome
    ? chromeDepuisReglages({ chromePresentation: chrome.chromePresentation })
    : {}

  /*
    Tant qu'on ne sait pas si la page est publiée, peindre le rendu historique
    mentirait au visiteur (TDR §22 / flash observé).
  */
  const enveloppe = { ...rootStyle, ...styleTypo(typoPubliee) }

  if (loading) {
    return (
      <CartProvider>
        <div style={{ ...enveloppe, minHeight: '100vh' }} data-cms-typo="" aria-busy="true">
          <PublicNav restaurant={restaurantPublie} presentation={{}} liens={[]} />
        </div>
      </CartProvider>
    )
  }

  // --- Chemin CMS : la page est publiée, on rend ses sections ---
  if (enabled && page && resolvedSections.length > 0) {
    const layout = normaliserPageLayout(page.layout)
    return (
      <CartProvider>
        <div style={enveloppe} data-cms-shell={layout} data-cms-typo="">
          <PublicNav
            overlay={miseEnPageSurBanniere(layout)}
            restaurant={restaurantPublie}
            presentation={presentationPubliee}
            liens={chrome ? liensDepuisChrome(chrome.headerLinks) : undefined}
          />
          <PageRenderer
            page={page}
            sections={resolvedSections}
            locale="fr"
            restaurant={restaurantPublie}
            pied={(
              <Footer
                restaurant={restaurantPublie}
                locale="fr"
                presentation={presentationPubliee}
                liens={chrome ? liensDepuisChrome(chrome.footerLinks) : undefined}
              />
            )}
          />
          <OrderCart />
        </div>
      </CartProvider>
    )
  }

  // --- Chemin legacy : les données viennent de site_content ---
  const restaurantLegacy: ResolvedRestaurant = {
    name: content.restaurantName,
    slogan: content.slogan,
    address: content.address,
    hours: content.hours,
    phone: content.phone,
    emailContact: content.emailContact,
    emailReservation: content.emailReservation,
    currency: content.currency,
    social: {
      facebook: content.socialFacebook,
      instagram: content.socialInstagram,
      whatsapp: content.socialWhatsapp,
    },
  }

  return (
    <CartProvider>
      <div style={rootStyle} data-cms-typo="">
          <PublicNav restaurant={restaurantLegacy} presentation={{}} liens={undefined} />
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
        <Footer restaurant={restaurantLegacy} presentation={{}} liens={undefined} />
        <OrderCart />
      </div>
    </CartProvider>
  )
}

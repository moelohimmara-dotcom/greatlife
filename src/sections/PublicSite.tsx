import React from 'react'
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
import { Footer } from './Footer'
import { OrderCart } from './OrderCart'

const SECTION_COMPONENTS: Record<string, () => React.ReactElement> = {
  home: Hero,
  carte: Carte,
  histoire: Story,
  engagements: Engagements,
  equipe: Team,
  localisation: Localisation,
  reservation: Reservation,
  contact: Contact,
  blog: Blog,
}

export function PublicSite() {
  const { visibility, rootStyle } = useSite()
  const order = visibility.sectionOrder?.length ? visibility.sectionOrder : Object.keys(SECTION_COMPONENTS)
  return (
    <CartProvider>
      <div style={rootStyle}>
        <PublicNav />
        {order.map(key => visibility.sections[key] && SECTION_COMPONENTS[key] ? (() => {
          const Comp = SECTION_COMPONENTS[key]
          return <Comp key={key} />
        })() : null)}
        <Footer />
        <OrderCart />
      </div>
    </CartProvider>
  )
}

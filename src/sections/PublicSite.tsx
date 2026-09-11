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

export function PublicSite() {
  const { visibility, rootStyle } = useSite()
  return (
    <CartProvider>
      <div style={rootStyle}>
        <PublicNav />
        {visibility.sections.home && <Hero />}
        {visibility.sections.carte && <Carte />}
        {visibility.sections.histoire && <Story />}
        {visibility.sections.engagements && <Engagements />}
        {visibility.sections.equipe && <Team />}
        {visibility.sections.localisation && <Localisation />}
        <Reservation />
        {visibility.sections.contact && <Contact />}
        {visibility.sections.blog && <Blog />}
        <Footer />
        <OrderCart />
      </div>
    </CartProvider>
  )
}

import { useSite } from '@/contexts/SiteContext'
import { PublicNav } from '@/components/nav/PublicNav'
import { Hero } from './Hero'
import { Carte } from './Carte'
import { Story } from './Story'
import { Engagements } from './Engagements'
import { Team } from './Team'
import { Localisation } from './Localisation'
import { ContactForm } from './Contact'
import { Blog } from './Blog'
import { Footer } from './Footer'

export function PublicSite() {
  const { visibility, rootStyle } = useSite()
  return (
    <div style={rootStyle}>
      <PublicNav />
      {visibility.sections.home && <Hero />}
      {visibility.sections.carte && <Carte />}
      {visibility.sections.histoire && <Story />}
      {visibility.sections.engagements && <Engagements />}
      {visibility.sections.equipe && <Team />}
      {visibility.sections.localisation && <Localisation />}
      {visibility.sections.contact && <ContactForm />}
      {visibility.sections.blog && <Blog />}
      <Footer />
    </div>
  )
}

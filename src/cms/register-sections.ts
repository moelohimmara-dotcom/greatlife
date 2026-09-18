/**
 * Greatlife — CMS : enregistrement des composants de section
 * ===========================================================
 * Câble les 10 sections existantes sur le registre du renderer.
 *
 * ⚠️ MODULE À EFFET DE BORD, RÉSERVÉ AU NAVIGATEUR (ou à un build Vite).
 *
 * Il importe des composants React qui dépendent de `@/contexts/SiteContext`,
 * donc de `@/lib/supabase`, donc de `import.meta.env`. L'importer dans un
 * script Node ferait échouer le chargement — voir l'en-tête de
 * `renderer/registry.ts` pour la démonstration.
 *
 * `@/cms` (point d'entrée complet) l'importe pour effet de bord. Le point
 * d'entrée `@/cms/renderer` ne l'importe PAS : il reste isomorphe.
 *
 * Les composants eux-mêmes sont branchés sur les données de façon
 * NON DESTRUCTIVE : sans contenu CMS, ils retombent exactement sur le rendu
 * historique (TDR §41 — non-régression).
 */

import { registerSectionComponent } from './renderer/registry'
import { Hero } from '@/sections/Hero'
import { Carte } from '@/sections/Carte'
import { Story } from '@/sections/Story'
import { Engagements } from '@/sections/Engagements'
import { Team } from '@/sections/Team'
import { Localisation } from '@/sections/Localisation'
import { Contact } from '@/sections/Contact'
import { Reservation } from '@/sections/Reservation'
import { Blog } from '@/sections/Blog'
import { Testimonials } from '@/sections/Testimonials'

/**
 * Enregistrement type du catalogue → composant visuel.
 * Les 10 types migrés de la page « Accueil » sont couverts ; les 10 autres
 * types du catalogue n'ont pas encore d'implémentation et utilisent le rendu
 * de secours.
 */
registerSectionComponent('hero', Hero)
registerSectionComponent('menu', Carte)
registerSectionComponent('story', Story)
registerSectionComponent('engagements', Engagements)
registerSectionComponent('team', Team)
registerSectionComponent('location', Localisation)
registerSectionComponent('contact', Contact)
registerSectionComponent('reservation', Reservation)
registerSectionComponent('blog', Blog)
registerSectionComponent('testimonials', Testimonials)

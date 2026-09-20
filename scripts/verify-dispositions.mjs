/**
 * CONTRÔLE DES DISPOSITIONS DE LA BANNIÈRE — lecture seule, aucun accès base.
 *
 * POURQUOI CE CONTRÔLE EXISTE
 * Les quatre dispositions du TDR §13 étaient déclarées, sélectionnables dans
 * l'éditeur et enregistrées en base — **et lues par aucun composant**. Le
 * restaurateur choisissait « Centré » et le site ne changeait pas. Corriger cela
 * sans le prouver aurait laissé exactement le même doute : « est-ce que ça fait
 * vraiment quelque chose ? »
 *
 * CE QU'IL PROUVE
 *  1. `image_text` — la disposition enregistrée par défaut — est rendue
 *     EXACTEMENT comme le rendu historique (comparaison caractère par
 *     caractère). C'est ce qui autorise `verify:lot1` à rester au vert.
 *  2. Les quatre dispositions produisent des rendus **différents deux à deux** :
 *     chacune change réellement la page. C'est la mesure qui manquait.
 *  3. Une disposition **inconnue ou absente** retombe sur le rendu historique :
 *     une donnée imprévue ne peut pas casser la page d'accueil.
 *
 * Usage : node scripts/verify-dispositions.mjs   (ou `npm run verify:dispositions`)
 */
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const WORK = `${ROOT}/node_modules/.cms-verify`
mkdirSync(WORK, { recursive: true })
const require = createRequire(import.meta.url)
const { build } = require('esbuild')

const entry = `${WORK}/dispositions.tsx`
const outfile = `${WORK}/dispositions.cjs`

writeFileSync(
  entry,
  `
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { SiteProvider } from '@/contexts/SiteContext'
import { CartProvider } from '@/contexts/CartContext'
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

const BLOCS = {
  hero: Hero,
  menu: Carte,
  story: Story,
  engagements: Engagements,
  team: Team,
  location: Localisation,
  contact: Contact,
  reservation: Reservation,
  blog: Blog,
  testimonials: Testimonials,
}

function wrap(C, props) {
  return renderToStaticMarkup(
    <SiteProvider><CartProvider><C {...props} /></CartProvider></SiteProvider>,
  )
}

export function rendre(variant, content, preview) {
  return wrap(Hero, { variant, content, preview })
}

export function rendreBloc(type, variant) {
  const C = BLOCS[type]
  const content = type === 'testimonials'
    ? { items: [{ name: 'Aïcha', text: 'On revient.' }, { name: 'Ibrahim', text: 'La carte est claire.' }] }
    : undefined
  try { return wrap(C, { variant, content }) } catch (e) { return 'ERROR: ' + e.message }
}
`,
  'utf8',
)

await build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  format: 'cjs',
  platform: 'node',
  jsx: 'automatic',
  // Vite injecte `import.meta.env` ; Node non. On le neutralise pour que le repli
  // local de l'application s'applique — même technique que `verify:lot1`.
  define: { 'import.meta.env': '{}' },
  alias: { '@': `${ROOT}/src` },
  loader: { '.ts': 'ts', '.tsx': 'tsx' },
  logLevel: 'warning',
})

delete require.cache[require.resolve(outfile)]
const { rendre, rendreBloc } = require(outfile)

const DISPOSITIONS = ['image_text', 'fullscreen', 'centered']

console.log('='.repeat(72))
console.log('A. CHAQUE DISPOSITION PRODUIT-ELLE UN RENDU DIFFÉRENT ?')
console.log('='.repeat(72))

/*
  LA VIDÉO EST TESTÉE AVEC UNE ADRESSE FOURNIE — et c'est le contrôle qui l'a
  imposé. Dans sa première version, il comparait « Vidéo » sans adresse : elle
  se rabattait alors sur « Plein écran » (repli voulu, documenté) et le contrôle
  criait à la disposition inerte. Il ne pouvait pas distinguer un repli VOULU
  d'une disposition MORTE — donc il ne prouvait rien sur la vidéo.
  On lui donne de quoi s'exécuter, et le repli est vérifié séparément en B.
*/
const VIDEO_URL = 'https://exemple.invalid/greatlife.mp4'
/*
  Le contenu arrive DÉJÀ APLATI dans le composant : `SectionRenderer` appelle
  `resolveContentObject(section.content, locale)` avant de le passer. La forme
  attendue est donc `{ video: 'https://…' }`, et non `{ video: { fr, en } }`.
*/
const CONTENU_AVEC_VIDEO = { video: VIDEO_URL }
const CONTENU_SANS_VIDEO = {}

const rendus = {}
for (const d of DISPOSITIONS) rendus[d] = rendre(d)
rendus.video = rendre('video', CONTENU_AVEC_VIDEO)

const TOUTES = [...DISPOSITIONS, 'video']
for (const d of TOUTES) {
  console.log(`  ${d.padEnd(12)} ${String(rendus[d].length).padStart(6)} caractères`)
}
console.log(`  (disposition « video » rendue AVEC une adresse de vidéo fournie)`)

let fautif = false
for (let i = 0; i < TOUTES.length; i++) {
  for (let j = i + 1; j < TOUTES.length; j++) {
    const a = TOUTES[i]
    const b = TOUTES[j]
    const identiques = rendus[a] === rendus[b]
    console.log(`  ${a} vs ${b} : ${identiques ? 'IDENTIQUES  <-- ECHEC' : 'différents'}`)
    if (identiques) fautif = true
  }
}
if (fautif) {
  console.log('\n  ECHEC : deux dispositions rendent la même chose — en choisir une ne changerait rien.')
  process.exitCode = 1
}

console.log('\n' + '='.repeat(72))
console.log('A-bis. LE REPLI DE « VIDÉO » EST-IL CELUI QU’ON ANNONCE ?')
console.log('='.repeat(72))

/*
  Comportement documenté dans l'éditeur (« laissez vide pour garder l'image ») :
  sans adresse, « Vidéo » retombe sur « Plein écran ». On le VÉRIFIE au lieu de
  l'affirmer — sinon le restaurateur choisirait « Vidéo » et ne verrait rien
  changer, sans explication.
*/
const videoSansUrl = rendre('video', CONTENU_SANS_VIDEO)
const repliOk = videoSansUrl === rendus.fullscreen
console.log(`  « Vidéo » sans adresse == « Plein écran » : ${repliOk ? 'OUI (repli documenté)' : 'NON  <-- ECHEC'}`)
console.log(`  « Vidéo » AVEC adresse contient une balise <video> : ${rendus.video.includes('<video') ? 'OUI' : 'NON  <-- ECHEC'}`)
if (!repliOk || !rendus.video.includes('<video')) fautif = true

const videoApercuVide = rendre('video', CONTENU_SANS_VIDEO, true)
const apercuDitManque = videoApercuVide.includes('colonne Modifier')
console.log(`  aperçu « Vidéo » sans fichier explique quoi faire : ${apercuDitManque ? 'OUI' : 'NON  <-- ECHEC'}`)
if (!apercuDitManque) fautif = true

console.log('\n' + '='.repeat(72))
console.log('B. LE DÉFAUT EST-IL LE RENDU HISTORIQUE ?')
console.log('='.repeat(72))

/*
  `image_text` est la valeur réellement enregistrée en base pour la Bannière.
  Si elle différait du rendu sans disposition, le site public changerait à la
  prochaine publication — et `verify:lot1` échouerait, à juste titre.
*/
const sansVariante = rendre(undefined)
const avecNull = rendre(null)
const defaut = rendus.image_text
console.log(`  image_text == sans variante : ${defaut === sansVariante ? 'OUI' : 'NON  <-- ECHEC'}`)
console.log(`  image_text == variante null : ${defaut === avecNull ? 'OUI' : 'NON  <-- ECHEC'}`)
if (defaut !== sansVariante || defaut !== avecNull) fautif = true

console.log('\n' + '='.repeat(72))
console.log('C. SENSIBILITÉ — une disposition INCONNUE ne casse rien')
console.log('='.repeat(72))

const inconnue = rendre('disposition-qui-nexiste-pas')
console.log(`  « disposition-qui-nexiste-pas » retombe sur le rendu historique : ${inconnue === defaut ? 'OUI' : 'NON  <-- ECHEC'}`)
if (inconnue !== defaut) fautif = true

console.log('\n' + '='.repeat(72))
console.log('D. LES AUTRES BLOCS IMPLÉMENTÉS BRANCHENT-ILS LEUR DISPOSITION ?')
console.log('='.repeat(72))

const BLOCS = {
  menu: { ids: ['full', 'by_category', 'tabs'], defaut: 'full' },
  story: { ids: ['image_left', 'image_right'], defaut: 'image_left' },
  engagements: { ids: ['grid', 'list'], defaut: 'grid' },
  team: { ids: ['grid', 'list'], defaut: 'grid' },
  location: { ids: ['card', 'wide'], defaut: 'card' },
  contact: { ids: ['card', 'wide'], defaut: 'card' },
  reservation: { ids: ['card', 'wide'], defaut: 'card' },
  blog: { ids: ['grid', 'list'], defaut: 'grid' },
  testimonials: { ids: ['cards', 'quotes'], defaut: 'cards' },
}

for (const [type, spec] of Object.entries(BLOCS)) {
  const html = {}
  for (const id of spec.ids) html[id] = rendreBloc(type, id)
  html.absent = rendreBloc(type, undefined)
  html.inconnue = rendreBloc(type, 'disposition-qui-nexiste-pas')

  const defautOk = html[spec.defaut] === html.absent && html[spec.defaut] === html.inconnue
  console.log(`  ${type.padEnd(14)} défaut « ${spec.defaut} » == absent/inconnu : ${defautOk ? 'OUI' : 'NON  <-- ECHEC'}`)
  if (!defautOk) fautif = true
  if (html[spec.defaut].includes('ERROR')) {
    console.log(`    ECHEC : le défaut a planté : ${html[spec.defaut].slice(0, 120)}`)
    fautif = true
  }

  for (let i = 0; i < spec.ids.length; i++) {
    for (let j = i + 1; j < spec.ids.length; j++) {
      const a = spec.ids[i]
      const b = spec.ids[j]
      const identiques = html[a] === html[b]
      console.log(`    ${a} vs ${b} : ${identiques ? 'IDENTIQUES  <-- ECHEC' : 'différents'}`)
      if (identiques) fautif = true
    }
  }
}

console.log('\n' + '='.repeat(72))
if (fautif) {
  console.log('ECHEC — voir les lignes ci-dessus.')
  process.exitCode = 1
} else {
  console.log('DISPOSITIONS VÉRIFIÉES — chaque choix agit, le défaut est inchangé.')
}
console.log('AUCUNE ÉCRITURE, AUCUN ACCÈS BASE — ce contrôle ne fait que rendre.')
console.log('='.repeat(72))

/**
 * CONTRÔLE DES MISES EN PAGE DE LA PAGE — lecture seule, aucun accès base.
 *
 * Cinq structures demandées : colonne unique, bannière + blocs alternés,
 * grille magazine, bannière plein écran, écran partagé.
 *
 *  1. Le défaut (colonne unique) est identique à une mise en page absente
 *     ou inconnue.
 *  2. Chaque choix produit un HTML différent (le restaurateur voit un changement).
 */
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const WORK = `${ROOT}/node_modules/.cms-verify`
mkdirSync(WORK, { recursive: true })
const require = createRequire(import.meta.url)
const { build } = require('esbuild')

const entry = `${WORK}/page-layouts.tsx`
const outfile = `${WORK}/page-layouts.cjs`

writeFileSync(
  entry,
  `
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { SiteProvider } from '@/contexts/SiteContext'
import { CartProvider } from '@/contexts/CartContext'
import '@/cms/register-sections'
import { PageRenderer } from '@/cms/renderer/PageRenderer'

const PAGE = {
  id: 'p', slug: '', title: {}, status: 'published', sortOrder: 0, seo: {},
  layout: 'single_column', publishedAt: null, createdAt: '', updatedAt: '', updatedBy: null,
}
const SECTIONS = [
  { id: 's1', pageId: 'p', type: 'hero', variant: 'image_text', position: 0, visible: true, anchor: 'home', content: {}, settings: {}, createdAt: '', updatedAt: '' },
  { id: 's2', pageId: 'p', type: 'story', variant: null, position: 1, visible: true, anchor: 'histoire', content: {}, settings: {}, createdAt: '', updatedAt: '' },
  { id: 's3', pageId: 'p', type: 'menu', variant: null, position: 2, visible: true, anchor: 'carte', content: {}, settings: {}, createdAt: '', updatedAt: '' },
]
const RESTAURANT = { name: 'Greatlife', address: '', hours: '', phone: '', emailContact: '', emailReservation: '', slogan: '', currency: 'FG', social: { facebook: '', whatsapp: '', instagram: '' } }

export function rendre(layout) {
  return renderToStaticMarkup(
    <SiteProvider>
      <CartProvider>
        <PageRenderer page={{ ...PAGE, layout: layout ?? PAGE.layout }} sections={SECTIONS} locale="fr" restaurant={RESTAURANT} layout={layout} />
      </CartProvider>
    </SiteProvider>,
  )
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
  define: { 'import.meta.env': '{}' },
  alias: { '@': `${ROOT}/src` },
  loader: { '.ts': 'ts', '.tsx': 'tsx' },
  logLevel: 'warning',
})

delete require.cache[require.resolve(outfile)]
const { rendre } = require(outfile)

const IDS = ['single_column', 'hero_alternating', 'magazine', 'hero_parallax', 'split']
let fautif = false
const html = {}
for (const id of IDS) html[id] = rendre(id)

console.log('='.repeat(72))
console.log('MISES EN PAGE DE LA PAGE')
console.log('='.repeat(72))

const defaut = html.single_column
console.log(`  colonne unique == sans choix : ${defaut === rendre(undefined) ? 'OUI' : 'NON  <-- ECHEC'}`)
console.log(`  colonne unique == inconnue : ${defaut === rendre('nexiste-pas') ? 'OUI' : 'NON  <-- ECHEC'}`)
if (defaut !== rendre(undefined) || defaut !== rendre('nexiste-pas')) fautif = true

for (let i = 0; i < IDS.length; i++) {
  for (let j = i + 1; j < IDS.length; j++) {
    const a = IDS[i]
    const b = IDS[j]
    const identiques = html[a] === html[b]
    console.log(`  ${a} vs ${b} : ${identiques ? 'IDENTIQUES  <-- ECHEC' : 'différents'}`)
    if (identiques) fautif = true
  }
}

const pane = readFileSync(`${ROOT}/src/admin/editor/PreviewPane.tsx`, 'utf8')
console.log('  aperçu Bureau : ' + (pane.includes("'Bureau'") || pane.includes('"Bureau"') ? 'OUI' : 'NON  <-- ECHEC'))
console.log('  aperçu Téléphone : ' + (pane.includes('Téléphone') ? 'OUI' : 'NON  <-- ECHEC'))
console.log('  cadre bureau 1200 px : ' + (pane.includes('1200') ? 'OUI' : 'NON  <-- ECHEC'))
console.log('  cadre téléphone 390 px : ' + (pane.includes('390') ? 'OUI' : 'NON  <-- ECHEC'))
if (!pane.includes('Bureau') || !pane.includes('Téléphone') || !pane.includes('1200') || !pane.includes('390')) fautif = true

const BANNIERE_PLEIN = 'min(78vh, 680px)'
const BANNIERE_HISTO = 'hero-grid'
for (const id of ['hero_parallax', 'magazine', 'split']) {
  const ok = html[id].includes(BANNIERE_PLEIN)
  console.log(`  ${id} oriente la bannière plein écran : ${ok ? 'OUI' : 'NON  <-- ECHEC'}`)
  if (!ok) fautif = true
}
const colonneUnique = html.single_column.includes(BANNIERE_HISTO) && !html.single_column.includes(BANNIERE_PLEIN)
console.log(`  colonne unique garde Image + texte : ${colonneUnique ? 'OUI' : 'NON  <-- ECHEC'}`)
if (!colonneUnique) fautif = true

const gabarits = [
  ['magazine', 'class="page-layout-grid"'],
  ['hero_parallax', 'class="page-layout-parallax"'],
  ['split', 'class="page-layout-split-hero"'],
  ['hero_alternating', 'data-cms-stripe'],
]
for (const [id, marqueur] of gabarits) {
  const ok = html[id].includes(marqueur)
  console.log(`  ${id} porte le gabarit ${marqueur} : ${ok ? 'OUI' : 'NON  <-- ECHEC'}`)
  if (!ok) fautif = true
}
const colonneSansGabarit =
  !html.single_column.includes('class="page-layout-grid"') &&
  !html.single_column.includes('class="page-layout-parallax"') &&
  !html.single_column.includes('class="page-layout-split-hero"')
console.log(`  colonne unique sans enveloppe : ${colonneSansGabarit ? 'OUI' : 'NON  <-- ECHEC'}`)
if (!colonneSansGabarit) fautif = true

const mag = html.magazine
const idxCell = mag.indexOf('class="page-layout-cell"')
const idxBand = mag.indexOf('class="page-layout-band"')
const idxMenu = mag.indexOf('data-cms-section="menu"')
const idxStory = mag.indexOf('data-cms-section="story"')
const storyEnCellule = idxCell >= 0 && idxStory > idxCell && (idxBand < 0 || idxStory < idxBand)
const menuEnBande = idxBand >= 0 && idxMenu > idxBand
console.log(`  magazine : histoire en carte : ${storyEnCellule ? 'OUI' : 'NON  <-- ECHEC'}`)
console.log(`  magazine : carte en bande : ${menuEnBande ? 'OUI' : 'NON  <-- ECHEC'}`)
if (!storyEnCellule || !menuEnBande) fautif = true

const shell = readFileSync(`${ROOT}/src/cms/renderer/page-layout-shell.ts`, 'utf8')
const publicSite = readFileSync(`${ROOT}/src/sections/PublicSite.tsx`, 'utf8')
console.log('  gabarits extraits du renderer : ' + (shell.includes('CSS_GABARITS_PAGE') ? 'OUI' : 'NON  <-- ECHEC'))
console.log('  pied de page dans le renderer : ' + (publicSite.includes('pied={<Footer') ? 'OUI' : 'NON  <-- ECHEC'))
console.log('  aperçu avec pied : ' + (pane.includes('pied={<Footer') ? 'OUI' : 'NON  <-- ECHEC'))
console.log('  menu sur bannière : ' + (publicSite.includes('miseEnPageSurBanniere') ? 'OUI' : 'NON  <-- ECHEC'))
const selecteursGrille =
  shell.includes('[style*="grid-template-columns"]') &&
  shell.includes('[style*="grid-template-columns: 1fr 1fr"]')
console.log('  gabarits replient les grilles internes : ' + (selecteursGrille ? 'OUI' : 'NON  <-- ECHEC'))
if (!shell.includes('CSS_GABARITS_PAGE') || !publicSite.includes('pied={<Footer') || !pane.includes('pied={<Footer') || !publicSite.includes('miseEnPageSurBanniere') || !selecteursGrille) fautif = true

console.log('='.repeat(72))
if (fautif) {
  console.log('ECHEC')
  process.exit(1)
} else {
  console.log('MISES EN PAGE VÉRIFIÉES — cinq choix distincts, défaut inchangé.')
  process.exit(0)
}

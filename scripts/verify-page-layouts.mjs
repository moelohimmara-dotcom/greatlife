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
import { mkdirSync, writeFileSync } from 'node:fs'
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

console.log('='.repeat(72))
if (fautif) {
  console.log('ECHEC')
  process.exit(1)
} else {
  console.log('MISES EN PAGE VÉRIFIÉES — cinq choix distincts, défaut inchangé.')
  process.exit(0)
}

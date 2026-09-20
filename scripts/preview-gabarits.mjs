/**
 * Aperçu local des gabarits magazine et bannière plein écran.
 * Aucune écriture en base. Sortie : node_modules/.cms-verify/preview-*.html
 */
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'node:http'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const WORK = `${ROOT}/node_modules/.cms-verify`
mkdirSync(WORK, { recursive: true })
const require = createRequire(import.meta.url)
const { build } = require('esbuild')

const entry = `${WORK}/preview-gabarits.tsx`
const outfile = `${WORK}/preview-gabarits.cjs`

writeFileSync(
  entry,
  `
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { SiteProvider } from '@/contexts/SiteContext'
import { CartProvider } from '@/contexts/CartContext'
import '@/cms/register-sections'
import { PageRenderer } from '@/cms/renderer/PageRenderer'
import { Footer } from '@/sections/Footer'

const PAGE = {
  id: 'p', slug: '', title: {}, status: 'published', sortOrder: 0, seo: {},
  layout: 'single_column', publishedAt: null, createdAt: '', updatedAt: '', updatedBy: null,
}
const sec = (id, type, anchor, position) => ({
  id, pageId: 'p', type, variant: null, position, visible: true, anchor, content: {}, settings: {}, createdAt: '', updatedAt: '',
})
const SECTIONS = [
  sec('s1', 'hero', 'home', 0),
  sec('s2', 'story', 'histoire', 1),
  sec('s3', 'engagements', 'engagements', 2),
  sec('s4', 'team', 'equipe', 3),
  sec('s5', 'menu', 'carte', 4),
  sec('s6', 'blog', 'blog', 5),
]
const RESTAURANT = {
  name: 'Greatlife', address: 'Conakry, Guinée', hours: '7h–23h',
  phone: '', emailContact: '', emailReservation: '', slogan: '', currency: 'FG',
  social: { facebook: '', whatsapp: '', instagram: '' },
}

export function page(layout) {
  return renderToStaticMarkup(
    <SiteProvider>
      <CartProvider>
        <div style={{ minHeight: '100%' }}>
          <PageRenderer
            page={{ ...PAGE, layout }}
            sections={SECTIONS}
            locale="fr"
            restaurant={RESTAURANT}
            layout={layout}
            pied={<Footer restaurant={RESTAURANT} />}
          />
        </div>
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
const { page } = require(outfile)

const wrap = (title, body) => `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; background: #F5EFE6; color: #2A241C; font-family: 'DM Sans', sans-serif; }
    :root { --c-primary:#2D5A27; --c-gold:#C4A35A; --c-cream:#F5EFE6; --c-surface:#fff; --c-surface-alt:#FAF6F0; --f-heading: Fraunces, serif; }
  </style>
  <script>
    document.addEventListener('DOMContentLoaded', function () {
      document.querySelectorAll('[style*="opacity"]').forEach(function (el) {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
    });
  </script>
</head>
<body>${body}</body>
</html>`

writeFileSync(`${WORK}/preview-column.html`, wrap('Colonne unique', page('single_column')))
writeFileSync(`${WORK}/preview-alternating.html`, wrap('Blocs alternés', page('hero_alternating')))
writeFileSync(`${WORK}/preview-magazine.html`, wrap('Grille magazine', page('magazine')))
writeFileSync(`${WORK}/preview-parallax.html`, wrap('Bannière plein écran', page('hero_parallax')))
writeFileSync(`${WORK}/preview-split.html`, wrap('Écran partagé', page('split')))

const PORT = 4178
const files = {
  '/column': `${WORK}/preview-column.html`,
  '/alternating': `${WORK}/preview-alternating.html`,
  '/magazine': `${WORK}/preview-magazine.html`,
  '/parallax': `${WORK}/preview-parallax.html`,
  '/split': `${WORK}/preview-split.html`,
}
const server = createServer((req, res) => {
  const fs = require('node:fs')
  const route = new URL(req.url, 'http://127.0.0.1').pathname
  const path = files[route] || files['/magazine']
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(fs.readFileSync(path))
})
server.listen(PORT, () => {
  console.log(`http://127.0.0.1:${PORT}/column`)
  console.log(`http://127.0.0.1:${PORT}/alternating`)
  console.log(`http://127.0.0.1:${PORT}/magazine`)
  console.log(`http://127.0.0.1:${PORT}/parallax`)
  console.log(`http://127.0.0.1:${PORT}/split`)
})

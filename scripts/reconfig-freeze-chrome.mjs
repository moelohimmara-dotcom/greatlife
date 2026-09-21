/**
 * Réconfig opérationnelle — figer le chrome dans published_snapshot.
 * Lecture restaurant + navigation, même pureté que publishPage / freezeChrome.
 * N’écrit QUE la clé `chrome` de l’instantané (pas les sections, pas le statut).
 *
 * Usage : node scripts/reconfig-freeze-chrome.mjs
 */
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const WORK = resolve(ROOT, 'scripts/.work')
mkdirSync(WORK, { recursive: true })

const envFile = existsSync(`${ROOT}/.env`) ? `${ROOT}/.env` : `${resolve(ROOT, '..')}/.env`
const ENV = {}
for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  if (line.includes('=') && !line.startsWith('#')) {
    const i = line.indexOf('=')
    ENV[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
}

const require = createRequire(import.meta.url)
const { build } = require('esbuild')

const entry = `${WORK}/freeze-chrome-entry.tsx`
writeFileSync(entry, `
export { freezeChrome } from '${ROOT.replace(/\\/g, '/')}/src/cms/model/publishing/snapshot.ts'
`)
const outfile = `${WORK}/freeze-chrome.cjs`
await build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  logLevel: 'silent',
})
const { freezeChrome } = require(outfile)

const PAGE_ID = '37a0e649-ce47-499b-aab5-84cd6b73b954'
const key = ENV.NEW_SERVICE_ROLE_KEY
const base = ENV.VITE_SUPABASE_URL
const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
}

async function rest(path, init) {
  const r = await fetch(`${base}/rest/v1/${path}`, { ...init, headers: { ...headers, ...(init?.headers ?? {}) } })
  const text = await r.text()
  if (!r.ok) throw new Error(`${r.status} ${path}: ${text}`)
  return text ? JSON.parse(text) : null
}

const restaurantRows = await rest('site_content?select=value&key=eq.restaurant')
const restaurantRaw = restaurantRows?.[0]?.value ?? {}

const navs = await rest('navigation?select=id,key')
const byKey = Object.fromEntries((navs ?? []).map((n) => [n.key, n.id]))
const headerId = byKey.header
const footerId = byKey.footer
if (!headerId || !footerId) throw new Error('navigation header/footer introuvable')

const items = await rest(
  `navigation_items?select=id,navigation_id,label_i18n,target_type,target_value,visible,is_cta,position&or=(navigation_id.eq.${headerId},navigation_id.eq.${footerId})&order=position.asc`,
)

function liensDe(navId) {
  return (items ?? [])
    .filter((i) => i.navigation_id === navId && i.visible !== false)
    .map((i) => ({
      id: i.id,
      label: i.label_i18n ?? '',
      target: (i.target_value ?? '').replace(/^#/, ''),
      visible: i.visible !== false,
      isCta: i.is_cta === true,
    }))
}

const chrome = freezeChrome({
  restaurantRaw,
  headerLinks: liensDe(headerId),
  footerLinks: liensDe(footerId),
})

writeFileSync(`${ROOT}/logs/backup-chrome-freeze-${Date.now()}.json`, JSON.stringify(chrome, null, 2))

const pages = await rest(`pages?select=id,published_snapshot&id=eq.${PAGE_ID}`)
const page = pages?.[0]
if (!page?.published_snapshot) throw new Error('instantané publié absent')

const avant = page.published_snapshot
writeFileSync(
  `${ROOT}/logs/backup-snapshot-avant-chrome.json`,
  JSON.stringify(avant, null, 2),
)

if (avant.chrome) {
  console.log('Chrome déjà présent dans l’instantané — aucune écriture.')
  process.exit(0)
}

const apres = { ...avant, chrome }
await rest(`pages?id=eq.${PAGE_ID}`, {
  method: 'PATCH',
  body: JSON.stringify({ published_snapshot: apres }),
})

console.log('Chrome figé dans published_snapshot.')
console.log(`  headerLinks : ${chrome.headerLinks.length}`)
console.log(`  footerLinks : ${chrome.footerLinks.length}`)
console.log(`  restaurant  : ${JSON.stringify(chrome.restaurant.name)}`)

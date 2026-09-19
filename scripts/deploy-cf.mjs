/**
 * Deploiement Cloudflare Pages par l'API, avec le jeton d'upload du connecteur.
 *
 * SEQUENCE (validee sur ce projet) :
 *   1. POST /pages/assets/check-missing      {hashes}        -> ceux a envoyer
 *   2. POST /pages/assets/upload             [{key,value,...}]-> envoi
 *   3. POST /pages/assets/upsert-hashes      {hashes}         -> SANS CETTE ETAPE
 *      le deploiement est VIDE (404)
 *   4. POST /accounts/{id}/pages/projects/{p}/deployments  multipart :
 *        - manifest : JSON {"/chemin": hash} (slash initial)
 *        - _redirects : fichier SEPARE, hors manifest
 *
 * Hachage officiel : blake3(base64(contenu) + extension_sans_point).hex[0:32]
 *
 * Usage : node deploy-cf.mjs <jeton-jwt> [--dry]
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, extname, sep } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { blake3 } = require('hash-wasm')

const TOKEN = process.argv[2]
const DRY = process.argv.includes('--dry')
if (!TOKEN) throw new Error('Jeton manquant : node deploy-cf.mjs <jwt> [--dry]')

const ACCOUNT = '71e00d35a00589b9497b6f65022c02a4'
const PROJECT = 'greatlife-conakry'
const DIST = 'dist'
const BRANCH = 'main'
const API = 'https://api.cloudflare.com/client/v4'

/** Parcourt `dist/` et renvoie la liste des fichiers. */
function walk(dir, base = dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...walk(full, base))
    else out.push(full)
  }
  return out
}

const files = walk(DIST)
console.log(`${files.length} fichiers dans ${DIST}/`)

// --- Hachage officiel -------------------------------------------------------
const manifest = {}
const payload = []
for (const f of files) {
  const buf = readFileSync(f)
  const rel = '/' + relative(DIST, f).split(sep).join('/')
  const ext = extname(f).replace(/^\./, '')
  const hash = (await blake3(buf.toString('base64') + ext)).slice(0, 32)
  manifest[rel] = hash
  payload.push({ key: hash, value: buf.toString('base64'), metadata: { contentType: mime(rel) }, base64: true })
}

function mime(p) {
  if (p.endsWith('.html')) return 'text/html; charset=utf-8'
  if (p.endsWith('.js')) return 'application/javascript; charset=utf-8'
  if (p.endsWith('.css')) return 'text/css; charset=utf-8'
  if (p.endsWith('.json')) return 'application/json; charset=utf-8'
  if (p.endsWith('.svg')) return 'image/svg+xml'
  if (p.endsWith('.png')) return 'image/png'
  if (p.endsWith('.jpg') || p.endsWith('.jpeg')) return 'image/jpeg'
  if (p.endsWith('.webp')) return 'image/webp'
  if (p.endsWith('.woff2')) return 'font/woff2'
  if (p.endsWith('.txt')) return 'text/plain; charset=utf-8'
  return 'application/octet-stream'
}

console.log('exemples de manifest :', Object.entries(manifest).slice(0, 4).map(([k, v]) => `${k} -> ${v}`))

// Le manifest complet est ecrit sur disque : la creation du deploiement exige
// un jeton de COMPTE (pas le jeton d'upload, scope aux assets), donc elle passe
// par le connecteur Cloudflare, qui a besoin du manifest en clair.
writeFileSync('dist-manifest.json', JSON.stringify(manifest, null, 1), 'utf8')
console.log(`manifest ecrit : dist-manifest.json (${Object.keys(manifest).length} entrees)`)

if (DRY) {
  console.log('mode --dry : rien envoye.')
  process.exit(0)
}

const auth = { Authorization: `Bearer ${TOKEN}` }

async function api(path, init = {}) {
  const r = await fetch(`${API}${path}`, { ...init, headers: { ...auth, ...(init.headers ?? {}) } })
  const text = await r.text()
  let body
  try { body = JSON.parse(text) } catch { body = text.slice(0, 300) }
  if (!r.ok) throw new Error(`${init.method ?? 'GET'} ${path} -> ${r.status} :: ${JSON.stringify(body).slice(0, 400)}`)
  return body
}

const hashes = Object.values(manifest)

// Les endpoints d'ASSETS sont globaux (`/pages/assets/...`), PAS sous le
// compte : le jeton d'upload est scopé au projet, pas à un compte. Les mettre
// sous `/accounts/...` renvoie « Authentication failed » (9106).
const ASSETS = '/pages/assets'

// --- 1. Quels fichiers manquent ? ------------------------------------------
const missing = await api(`${ASSETS}/check-missing`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hashes }),
})
const aEnvoyer = new Set(missing.result ?? [])
console.log(`\n1. check-missing : ${aEnvoyer.size} fichier(s) a envoyer sur ${hashes.length}`)

// --- 2. Envoi ---------------------------------------------------------------
if (aEnvoyer.size > 0) {
  const lot = payload.filter((p) => aEnvoyer.has(p.key))
  const up = await api(`${ASSETS}/upload`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lot),
  })
  console.log(`2. upload : ${(up.result ?? []).length} fichier(s) accepte(s)`)
} else {
  console.log('2. upload : rien a envoyer (tout deja present)')
}

// --- 3. upsert-hashes : SANS CETTE ETAPE LE DEPLOIEMENT EST VIDE -----------
await api(`${ASSETS}/upsert-hashes`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hashes }),
})
console.log('3. upsert-hashes : OK')

// --- 4. Deploiement (multipart) --------------------------------------------
const redirects = readFileSync(join(DIST, '_redirects'), 'utf8')
const b = `----glife${Date.now()}`
const body = [
  `--${b}`, 'Content-Disposition: form-data; name="manifest"', 'Content-Type: application/json', '',
  JSON.stringify(manifest),
  `--${b}`, 'Content-Disposition: form-data; name="branch"', '', BRANCH,
  `--${b}`, 'Content-Disposition: form-data; name="_redirects"; filename="_redirects"',
  'Content-Type: text/plain', '', redirects,
  `--${b}--`, '',
].join('\r\n')

const dep = await api(`/accounts/${ACCOUNT}/pages/projects/${PROJECT}/deployments`, {
  method: 'POST',
  headers: { 'Content-Type': `multipart/form-data; boundary=${b}` },
  body,
})
const d = dep.result
console.log(`\n4. deploiement : ${d.id}`)
console.log(`   url   : ${d.url}`)
console.log(`   etape : ${d.latest_stage?.name} / ${d.latest_stage?.status}`)

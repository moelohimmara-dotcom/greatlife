/**
 * Réconfig — « Mettre à jour le site » pour la page d’accueil.
 * ============================================================
 * Appelle le VRAI `publishPage` (contrôles §24 → version → instantané+statut).
 * N’efface PAS l’instantané avant (contrairement à probe-publish.mjs).
 *
 * Garde-fou : GLIFE_ALLOW_PROD_WRITE=1 requis.
 * Usage :
 *   $env:GLIFE_ALLOW_PROD_WRITE='1'; node scripts/reconfig-publish-home.mjs
 */
if (process.env.GLIFE_ALLOW_PROD_WRITE !== '1') {
  console.log('REFUS : posez GLIFE_ALLOW_PROD_WRITE=1 pour écrire en production.')
  process.exit(2)
}

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const WORK = `${ROOT}/node_modules/.cms-verify`
mkdirSync(WORK, { recursive: true })
mkdirSync(`${ROOT}/logs`, { recursive: true })

const envFile = existsSync(`${ROOT}/.env`) ? `${ROOT}/.env` : `${resolve(ROOT, '..')}/.env`
const ENV = {}
for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  if (line.includes('=') && !line.startsWith('#')) {
    const i = line.indexOf('=')
    ENV[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
}

const URL = ENV.VITE_SUPABASE_URL
const ANON = ENV.VITE_SUPABASE_ANON_KEY
const SVC = ENV.NEW_SERVICE_ROLE_KEY
const EMAIL = ENV.PROBE_EMAIL
const PASSWORD = ENV.PROBE_PASSWORD
if (!URL || !ANON || !SVC) throw new Error('VITE_SUPABASE_* / NEW_SERVICE_ROLE_KEY manquants')
if (!EMAIL || !PASSWORD) throw new Error('PROBE_EMAIL / PROBE_PASSWORD manquants dans .env')

const require = createRequire(import.meta.url)
const { build } = require('esbuild')

async function bundleFile(name, contents) {
  const entry = `${WORK}/${name}.tsx`
  const outfile = `${WORK}/${name}.cjs`
  writeFileSync(entry, contents, 'utf8')
  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: 'cjs',
    platform: 'node',
    jsx: 'automatic',
    define: {
      'import.meta.env': JSON.stringify({ VITE_SUPABASE_URL: URL, VITE_SUPABASE_ANON_KEY: ANON }),
    },
    alias: { '@': `${ROOT}/src` },
    loader: { '.tsx': 'tsx', '.ts': 'ts' },
    logLevel: 'warning',
  })
  delete require.cache[require.resolve(outfile)]
  return require(outfile)
}

async function rest(path, method = 'GET', body) {
  const headers = {
    apikey: SVC,
    Authorization: `Bearer ${SVC}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  }
  const r = await fetch(`${URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await r.text()
  if (!r.ok) throw new Error(`REST ${r.status} ${path} :: ${text.slice(0, 300)}`)
  return text ? JSON.parse(text) : null
}

const PAGE_ID = '37a0e649-ce47-499b-aab5-84cd6b73b954'

const avant = await rest(`pages?select=id,status,published_at,published_snapshot&id=eq.${PAGE_ID}`)
const pageAvant = avant?.[0]
if (!pageAvant) throw new Error('page introuvable')
writeFileSync(
  `${ROOT}/logs/backup-snapshot-avant-publish-${Date.now()}.json`,
  JSON.stringify(pageAvant.published_snapshot, null, 2),
)
console.log(`Avant : statut=${pageAvant.status} | chrome=${pageAvant.published_snapshot?.chrome ? 'oui' : 'non'} | sections=${pageAvant.published_snapshot?.sections?.length ?? 0}`)

const authRes = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
})
if (!authRes.ok) throw new Error('Connexion admin impossible : ' + (await authRes.text()).slice(0, 200))
const sess = await authRes.json()
console.log('Session :', sess.user.email)

const adm = await bundleFile(
  'reconfig-publish',
  `import { getSupabase } from '@/lib/supabase'
   import { publishPage } from '@/cms/repository/publishing'
   export async function run(pageId, token, refresh) {
     const sb = getSupabase()
     if (!sb) return { ok: false, error: 'client indisponible' }
     const { error } = await sb.auth.setSession({ access_token: token, refresh_token: refresh })
     if (error) return { ok: false, error: 'session refusee : ' + error.message }
     return publishPage(pageId, ${JSON.stringify(EMAIL)}, 'fr')
   }`,
)

const result = await adm.run(PAGE_ID, sess.access_token, sess.refresh_token)
if (!result.ok) {
  console.error('ECHEC publishPage :', result.error)
  process.exit(1)
}
if (!result.data.published) {
  console.error('Publication BLOQUÉE par les contrôles :')
  for (const f of (result.data.report.blockers ?? result.data.report.findings ?? []).slice(0, 12)) {
    console.error(`  · [${f.check ?? f.checkId}] ${f.message}`)
  }
  process.exit(1)
}

const apres = await rest(`pages?select=status,published_at,published_snapshot&id=eq.${PAGE_ID}`)
const snap = apres[0].published_snapshot
const versions = await rest(
  `page_versions?select=version,note,created_at&page_id=eq.${PAGE_ID}&order=version.desc&limit=3`,
)

writeFileSync(
  `${ROOT}/logs/retour-arriere-apres-publish.sql`,
  `-- Retour arrière après publishPage ${new Date().toISOString()}
-- Remplacer le snapshot par le backup logs/backup-snapshot-avant-publish-*.json
-- puis éventuellement DELETE la dernière page_versions créée.
-- pages.id = ${PAGE_ID}
-- version créée : ${result.data.version?.version ?? '?'}
`,
)

console.log('Publié.')
console.log(`  version archivée : ${result.data.version?.version ?? '—'}`)
console.log(`  sections figées  : ${snap?.sections?.length}`)
console.log(`  chrome           : ${snap?.chrome ? 'oui' : 'NON'}`)
console.log(`  layout           : ${snap?.page?.layout}`)
console.log(`  dernières versions : ${(versions ?? []).map((v) => v.version).join(', ')}`)

/**
 * ⚠️⚠️  CE SCRIPT ECRIT DANS LA BASE DE PRODUCTION.  ⚠️⚠️
 *
 * Il est REFUSE par defaut. Pour l'executer, il faut poser explicitement
 * `GLIFE_ALLOW_PROD_WRITE=1` — geste d'operateur, jamais une routine.
 *
 * Ce qu'il ecrit, precisement :
 *   1. remet la page en `draft` et efface `published_snapshot` (PATCH direct,
 *      avec la cle de service) ;
 *   2. appelle `publishPage` — donc archive une version, ecrit l'instantane et
 *      repasse la page en `published`.
 *
 * POURQUOI CE GARDE-FOU EXISTE
 * Une version precedente s'executait sans precaution. Resultat mesure en
 * production : `pages.published_snapshot` ne correspondait plus a
 * `page_versions[1].snapshot`, et `published_at` ne correspondait a rien — un
 * etat publie qu'aucun bouton n'aurait produit. Le critere 9 de
 * `docs/10_PUBLISHING_VERSIONING.md` §10 interdit a un script de verification
 * d'ecrire en production. Un script qui fabrique l'etat qu'il constate ne
 * verifie rien.
 *
 * Un controle de la publication doit aujourd'hui se faire sur une base de
 * recette, ou par une action humaine assumee — pas en silence sur la
 * production.
 */
if (process.env.GLIFE_ALLOW_PROD_WRITE !== '1') {
  console.log('='.repeat(66))
  console.log('REFUS : ce script ECRIT dans la base de PRODUCTION.')
  console.log('='.repeat(66))
  console.log('Il remet la page en brouillon, efface l instantane publie,')
  console.log('puis republie. Cela peut rendre le contenu en ligne incoherent')
  console.log('avec l historique des versions.')
  console.log('')
  console.log('Pour l executer quand meme, et en connaissance de cause :')
  console.log('  $env:GLIFE_ALLOW_PROD_WRITE=1 ; node scripts/probe-publish.mjs')
  console.log('='.repeat(66))
  process.exit(2)
}

/**
 * PREUVE du chemin d'ECRITURE réel : `publishPage` (bouton « Publier »).
 *
 * Appelle la VRAIE fonction du projet, avec une session d'administration, puis
 * vérifie en base que l'instantané a bien été écrit par ce chemin.
 *
 * Déroulé :
 *   1. remet la page en brouillon et efface l'instantané (état « jamais publiée ») ;
 *   2. vérifie qu'aucun visiteur ne voit de contenu CMS ;
 *   3. appelle `publishPage` — le chemin exact du bouton « Publier » ;
 *   4. vérifie que l'instantané est écrit ET que le visiteur le voit.
 *
 * Usage : node scripts/probe-publish.mjs
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const WORK = `${ROOT}/node_modules/.cms-verify`
mkdirSync(WORK, { recursive: true })
const require = createRequire(import.meta.url)
const { build } = require('esbuild')

const ENV = {}
for (const line of readFileSync(`${ROOT}/.env`, 'utf8').split(/\r?\n/)) {
  if (line.includes('=') && !line.startsWith('#')) {
    const i = line.indexOf('=')
    ENV[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
}
const URL = ENV.VITE_SUPABASE_URL
const ANON = ENV.VITE_SUPABASE_ANON_KEY
const SVC = ENV.NEW_SERVICE_ROLE_KEY

async function bundleFile(name, contents, define) {
  const entry = `${WORK}/${name}.tsx`
  const outfile = `${WORK}/${name}.cjs`
  writeFileSync(entry, contents, 'utf8')
  await build({
    entryPoints: [entry], outfile, bundle: true, format: 'cjs', platform: 'node',
    jsx: 'automatic', define, alias: { '@': `${ROOT}/src` },
    loader: { '.tsx': 'tsx', '.ts': 'ts' }, logLevel: 'warning',
  })
  delete require.cache[require.resolve(outfile)]
  return require(outfile)
}

async function rest(path, method = 'GET', body, prefer) {
  const headers = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json' }
  if (prefer) headers.Prefer = prefer
  const r = await fetch(`${URL}/rest/v1/${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  })
  const text = await r.text()
  if (!r.ok) throw new Error(`REST ${r.status} ${path} :: ${text.slice(0, 200)}`)
  return text ? JSON.parse(text) : null
}

// --- Session d'administration ----------------------------------------------
// ⚠️ AUCUN identifiant en dur dans ce fichier. Ce script a ete committe une fois
// avec le mot de passe du compte proprietaire : le depot est PUBLIC, donc le
// secret a fuite. Il se lit desormais dans `.env` (gitignore), comme les clefs.
const EMAIL = ENV.PROBE_EMAIL
const PASSWORD = ENV.PROBE_PASSWORD
if (!EMAIL || !PASSWORD) {
  throw new Error(
    'PROBE_EMAIL et PROBE_PASSWORD doivent etre definis dans .env (compte de test).',
  )
}

const authRes = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
})
if (!authRes.ok) throw new Error('Connexion impossible : ' + (await authRes.text()).slice(0, 200))
const sess = await authRes.json()
console.log('session obtenue pour', sess.user.email)

// Bundle AVEC la session : c'est le chemin d'administration réel.
const adm = await bundleFile(
  'admin-publish',
  `import { getSupabase } from '@/lib/supabase'
   import { publishPage } from '@/cms/repository/publishing'
   export async function run(pageId, token, refresh) {
     const sb = getSupabase()
     if (!sb) return { ok: false, error: 'client indisponible' }
     const { error } = await sb.auth.setSession({ access_token: token, refresh_token: refresh })
     if (error) return { ok: false, error: 'session refusee : ' + error.message }
     return publishPage(pageId, null, 'fr')
   }`,
  { 'import.meta.env': JSON.stringify({ VITE_SUPABASE_URL: URL, VITE_SUPABASE_ANON_KEY: ANON }) },
)
const pub = await bundleFile(
  'public-read-2',
  `export { fetchPublicPageWithSections } from '@/cms/repository/sections'`,
  { 'import.meta.env': JSON.stringify({ VITE_SUPABASE_URL: URL, VITE_SUPABASE_ANON_KEY: ANON }) },
)

const pages = await rest('pages?select=id,slug,status,published_snapshot')
const page = pages[0]
console.log(`page : ${page.id} | statut=${page.status}`)

console.log('\n' + '='.repeat(66))
console.log('1. ETAT « JAMAIS PUBLIEE » (brouillon, sans instantané)')
console.log('='.repeat(66))
await rest(`pages?id=eq.${page.id}`, 'PATCH',
  { status: 'draft', published_snapshot: null }, 'return=minimal')
const apresReset = await rest(`pages?select=status,published_snapshot&id=eq.${page.id}`)
console.log(`  statut=${apresReset[0].status} | instantane=${apresReset[0].published_snapshot ? 'present' : 'NULL'}`)
const avantPub = await pub.fetchPublicPageWithSections('')
console.log(`  le public voit du contenu CMS : ${avantPub.data ? 'OUI' : 'non (rendu historique)'}`)

console.log('\n' + '='.repeat(66))
console.log('2. APPEL de publishPage (le chemin du bouton « Publier »)')
console.log('='.repeat(66))
const result = await adm.run(page.id, sess.access_token, sess.refresh_token)
if (!result.ok) {
  console.log('  ECHEC :', result.error)
  process.exitCode = 1
} else if (!result.data.published) {
  console.log('  publication BLOQUEE par les controles TDR §24 :')
  const bloquants = result.data.report.findings.filter((f) => f.level === 'error')
  for (const f of bloquants.slice(0, 8)) console.log(`    · [${f.checkId}] ${f.message}`)
  console.log(`  (${bloquants.length} constat(s) bloquant(s))`)
} else {
  console.log('  publiee.')
  console.log(`  version archivee : ${result.data.version?.version ?? '—'}`)

  console.log('\n' + '='.repeat(66))
  console.log('3. VERIFICATION EN BASE')
  console.log('='.repeat(66))
  const apres = await rest(`pages?select=status,published_snapshot&id=eq.${page.id}`)
  const snap = apres[0].published_snapshot
  console.log(`  statut : ${apres[0].status}`)
  console.log(`  instantane : ${snap ? 'present (' + JSON.stringify(snap).length + ' octets)' : 'NULL'}`)
  if (snap) {
    console.log(`  formatVersion : ${snap.formatVersion} | sections figees : ${snap.sections?.length}`)
  }
  const versions = await rest(`page_versions?select=version,note&page_id=eq.${page.id}&order=version.desc`)
  console.log(`  versions archivees : ${versions.length}`)

  console.log('\n' + '='.repeat(66))
  console.log('4. LE VISITEUR VOIT-IL LE CONTENU PUBLIE ?')
  console.log('='.repeat(66))
  const apresPub = await pub.fetchPublicPageWithSections('')
  if (apresPub.data) {
    console.log(`  sections servies : ${apresPub.data.sections.length}`)
    console.log(`  types : ${apresPub.data.sections.map((s) => s.type).join(', ')}`)
    console.log('\n  >>> CHAINE COMPLETE : ecriture par publishPage + lecture publique OK')
  } else {
    console.log('  le public ne voit RIEN — echec de la chaine')
    process.exitCode = 1
  }
}

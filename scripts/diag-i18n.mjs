/**
 * Diagnostic I6 — ampleur des degats et possibilite de recuperation.
 *
 * 1. passe le validateur REEL sur toutes les sections reelles et liste les
 *    champs qui ont perdu leur forme bilingue ;
 * 2. cherche, dans les versions archivees, une valeur bilingue intacte pour
 *    ces memes champs (l'anglais perdu y est peut-etre encore).
 *
 * Usage : node scripts/diag-i18n.mjs
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

const M = await bundleFile('i18n-diag', `
  export { validateSectionContent } from '@/cms/model/sections/validation'
  export { getSectionDefinition } from '@/cms/model/sections/schemas'
`, { 'import.meta.env': '{}' })

async function lecture(path) {
  const r = await fetch(`${URL}/rest/v1/${path}`, {
    headers: { apikey: SVC, Authorization: `Bearer ${SVC}` },
  })
  const t = await r.text()
  if (!r.ok) throw new Error(`GET ${path} -> ${r.status} :: ${t.slice(0, 200)}`)
  return t ? JSON.parse(t) : null
}

const sections = await lecture('page_sections?select=id,type,content,updated_at&order=position')

console.log('='.repeat(70))
console.log('1. CHAMPS AYANT PERDU LEUR FORME BILINGUE (validateur REEL)')
console.log('='.repeat(70))

const abimes = []
for (const s of sections) {
  const issues = M.validateSectionContent(s.type, s.content ?? {})
  const perdues = issues.filter((i) => i.message.includes('perdu sa version anglaise'))
  if (perdues.length) {
    console.log(`\n  [${s.type}]  modifie le ${s.updated_at}`)
    for (const p of perdues) {
      console.log(`     - ${p.path} : ${p.message.slice(0, 60)}...`)
      abimes.push({ section: s.type, sectionId: s.id, champ: p.path, valeur: (s.content ?? {})[p.path] })
    }
  }
}
if (!abimes.length) console.log('  aucun champ abime.')
console.log(`\n  TOTAL : ${abimes.length} champ(s) abime(s) sur ${sections.length} sections.`)

// Combien de faux positifs ? On compte TOUS les avertissements produits, pour
// verifier que le nouveau controle ne noie pas le restaurateur sous le bruit.
let totalAvert = 0
for (const s of sections) {
  totalAvert += M.validateSectionContent(s.type, s.content ?? {}).filter((i) => i.level === 'warning').length
}
console.log(`  avertissements au total (toutes causes) : ${totalAvert}`)

console.log('\n' + '='.repeat(70))
console.log('2. RECUPERATION — l\'anglais perdu existe-t-il dans une version archivee ?')
console.log('='.repeat(70))

const page = (await lecture('pages?select=id'))[0]
const versions = await lecture(
  `page_versions?select=version,snapshot,created_at&page_id=eq.${page.id}&order=version.asc`)

for (const a of abimes) {
  console.log(`\n  ${a.section}.${a.champ}`)
  console.log(`    valeur ACTUELLE : ${JSON.stringify(a.valeur).slice(0, 90)}`)
  for (const v of versions) {
    const snap = v.snapshot?.sections?.find((x) => x.id === a.sectionId)
    const val = snap?.content?.[a.champ]
    const bilingue = val && typeof val === 'object' && ('fr' in val || 'en' in val)
    console.log(`    version ${v.version} (${v.created_at}) : ` +
      (bilingue ? `BILINGUE INTACT -> ${JSON.stringify(val).slice(0, 110)}`
                : `non exploitable -> ${JSON.stringify(val).slice(0, 60)}`))
  }
}

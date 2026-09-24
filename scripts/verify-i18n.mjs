/**
 * Greatlife — contrôle I6 : un champ traduisible doit rester ÉDITABLE EN DEUX LANGUES
 * ===================================================================================
 * DÉFAUT CONSTATÉ
 * `MultilineField` (src/admin/editor/PropertyPanel.tsx) n'avait pas la branche
 * bilingue que possède `TextField`. Il écrivait donc une CHAÎNE SIMPLE là où la
 * valeur était un objet `{ fr, en }` :
 *     hero.subtitle :  { fr: "..." }  ->  "Produits 100% bio, ..."
 *     story.body    :  { fr: "..." }  ->  "Greatlife est né d'une ..."
 *
 * CE QUI ÉTAIT PERDU, EXACTEMENT
 * Pas de texte anglais : mesuré, les 61 valeurs bilingues du contenu ont TOUTES
 * un `en` vide. C'est la STRUCTURE qui disparaissait — donc la POSSIBILITÉ
 * d'ajouter l'anglais, et le contrôle « n'est pas encore traduit » cessait de
 * se déclencher, rendant l'anomalie invisible.
 *
 * CE QUE CE CONTRÔLE VÉRIFIE
 *   A. un champ traduisible de type `multiline` rend DEUX zones de texte
 *      (français + anglais) — c'est la propriété qui manquait ;
 *   B. sensibilité : la mesure distingue bien les deux états. Un champ NON
 *      traduisible ne rend qu'une zone, et la différence est comptée
 *      précisément (delta de 1) plutôt que par un total absolu, faux dès qu'une
 *      section contient plusieurs champs longs ;
 *   C. sur les DONNÉES RÉELLES : aucun champ traduisible ne doit encore porter
 *      une chaîne simple (sinon la migration 032 n'a pas été appliquée).
 *
 * Ce contrôle échoue sur le code d'avant le correctif : c'est ce qui le rend
 * utile. Vérifié en remettant l'ancienne version du composant.
 *
 * Usage : node scripts/verify-i18n.mjs
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

const H = await bundleFile('i18n-harness', `
  import { renderToStaticMarkup } from 'react-dom/server'
  import { SiteProvider } from '@/contexts/SiteContext'
  import { PropertyPanel } from '@/admin/editor/PropertyPanel'
  import { getSectionDefinition } from '@/cms/model/sections/schemas'
  import { validateSectionContent } from '@/cms/model/sections/validation'

  const base = {
    id: 's1', pageId: 'p1', variant: null, position: 0,
    visible: true, anchor: null, settings: {},
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  }

  export function champsLongs(type) {
    return getSectionDefinition(type).fields
      .filter((f) => f.type === 'multiline')
      .map((f) => ({ name: f.name, label: f.label, translatable: f.translatable !== false }))
  }

  export function rendre(type, content) {
    return renderToStaticMarkup(
      <SiteProvider>
        <PropertyPanel section={{ ...base, type, content }} locale="fr"
          onUpdate={() => {}} onVariantChange={() => {}} />
      </SiteProvider>,
    )
  }

  export { validateSectionContent }
`, { 'import.meta.env': JSON.stringify({ VITE_SUPABASE_URL: URL, VITE_SUPABASE_ANON_KEY: ENV.VITE_SUPABASE_ANON_KEY }) })

/** Une zone éditable = textarea plain OU textbox rich (TextToolbox contentEditable). */
const zones = (html) =>
  (html.match(/<textarea\b/g) ?? []).length +
  (html.match(/role="textbox"/g) ?? []).length

const failures = []
function check(ok, label, detail) {
  console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(label)
}

// Les sections réellement présentes en base, pour ne pas tester du vide.
const sections = await (async () => {
  const r = await fetch(`${URL}/rest/v1/page_sections?select=type,content&order=position`, {
    headers: { apikey: SVC, Authorization: `Bearer ${SVC}` },
  })
  return r.json()
})()

console.log('I6 — un champ traduisible reste-t-il éditable en DEUX langues ?\n')
console.log('A. chaque champ long traduisible rend FR + EN')

let testes = 0
for (const s of sections) {
  const longs = H.champsLongs(s.type)
  const traduisibles = longs.filter((f) => f.translatable)
  if (!traduisibles.length) continue

  // Référence : tous les champs longs VIDES (chaîne simple).
  const vide = {}
  for (const f of longs) vide[f.name] = ''

  for (const f of traduisibles) {
    // Un seul champ passe en forme bilingue : l'écart isole SON rendu.
    const bilingue = { ...vide, [f.name]: { fr: 'Texte français', en: 'English text' } }
    const delta = zones(H.rendre(s.type, bilingue)) - zones(H.rendre(s.type, vide))
    testes++
    check(delta === 1, `${s.type}.${f.name} (« ${f.label} ») : 2 zones au lieu d'1`, `delta=${delta}`)
  }
}
if (testes === 0) check(false, 'au moins un champ long traduisible testé', 'aucun trouvé')

console.log('\nB. sensibilité — la mesure distingue bien les deux états')
const longsStory = H.champsLongs('story')
const nonTrad = longsStory.filter((f) => !f.translatable)
if (nonTrad.length) {
  const vide = {}
  for (const f of longsStory) vide[f.name] = ''
  const avecObjet = { ...vide, [nonTrad[0].name]: { fr: 'a', en: 'b' } }
  const d = zones(H.rendre('story', avecObjet)) - zones(H.rendre('story', vide))
  check(d === 0, `un champ NON traduisible ne gagne pas de zone anglaise (${nonTrad[0].name})`, `delta=${d}`)
} else {
  console.log('  (aucun champ long non traduisible : contrôle ignoré)')
}

console.log('\nC. données réelles — plus aucune chaîne simple sur un champ traduisible')
let abimes = 0
for (const s of sections) {
  const issues = H.validateSectionContent(s.type, s.content ?? {})
  const perdues = issues.filter((i) => i.message.includes('perdu sa version anglaise'))
  if (perdues.length) {
    abimes += perdues.length
    console.log(`     ${s.type} : ${perdues.map((p) => p.path).join(', ')}`)
  }
}
check(abimes === 0, 'aucun champ traduisible au format chaîne', `${abimes} trouvé(s)`)

console.log('\n' + '='.repeat(64))
if (failures.length) {
  console.log(`❌ I6 EN ÉCHEC — ${failures.length} contrôle(s) :`)
  for (const f of failures) console.log(`   · ${f}`)
  process.exit(1)
}
console.log("✅ I6 VÉRIFIÉ — les champs traduisibles restent bilingues.")

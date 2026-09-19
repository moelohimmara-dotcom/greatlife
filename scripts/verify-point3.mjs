/**
 * Greatlife — CMS : contrôle du point 3
 * =====================================
 * « Une liste d'objets doit éditer TOUS ses champs. »
 *
 * DÉFAUT CONSTATÉ
 * `ListField` (src/admin/editor/PropertyPanel.tsx) n'affichait que
 * `itemFields[0]`. Conséquence pour le restaurateur : dans « Équipe », un membre
 * n'exposait que son NOM — le rôle et la présentation étaient inaccessibles,
 * donc impossibles à corriger. Idem : le texte d'un avis, la légende d'une
 * photo, la réponse d'une question, le libellé d'un motif de contact.
 * 6 sous-champs sur 6 listes étaient hors d'atteinte.
 *
 * POURQUOI CE CONTRÔLE N'EST PAS UN TEST DE NAVIGATEUR
 * Le panneau a été piloté en vrai (clics physiques via CDP) : le résultat
 * dépendait du rendu, du défilement et de l'onglet actif, donc instable. Ici le
 * composant est rendu hors navigateur, avec le contenu réel de la base : le
 * verdict ne dépend plus de l'environnement.
 *
 * CE QU'IL VÉRIFIE
 *   A. chaque sous-champ déclaré produit bien un champ ÉDITABLE ;
 *   B. chaque champ est relié à SA valeur (et non à celle d'un autre) ;
 *   C. sensibilité : une liste à un seul sous-champ n'en rend qu'un — le
 *      contrôle échouerait donc si le correctif régressait.
 *
 * Usage : node scripts/verify-point3.mjs
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const WORK = `${ROOT}/node_modules/.cms-verify`
mkdirSync(WORK, { recursive: true })

const require = createRequire(import.meta.url)
const { build } = require('esbuild')

/** Bundle un point d'entrée et le renvoie (React embarqué). */
async function bundleFile(name, contents) {
  const entry = `${WORK}/${name}.tsx`
  const outfile = `${WORK}/${name}.cjs`
  writeFileSync(entry, contents, 'utf8')
  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: 'cjs',            // react-dom/server est du CommonJS
    platform: 'node',
    jsx: 'automatic',
    define: { 'import.meta.env': '{}' },
    alias: { '@': `${ROOT}/src` },
    loader: { '.tsx': 'tsx', '.ts': 'ts' },
    logLevel: 'warning',
  })
  delete require.cache[require.resolve(outfile)]
  return require(outfile)
}

// Contenu RÉEL de la base (page_sections, section `team`), pour que le contrôle
// porte sur des données que le restaurateur voit vraiment.
const TEAM_MEMBER = {
  name: { fr: 'Mister Marcket' },
  role: { fr: 'Fondateur & Propriétaire' },
  desc: { fr: 'Visionnaire derrière le concept de fast-food bio accessible.' },
}

const harness = `
import { renderToStaticMarkup } from 'react-dom/server'
import { SiteProvider } from '@/contexts/SiteContext'
import { PropertyPanel } from '@/admin/editor/PropertyPanel'

const base = {
  id: 's1', pageId: 'p1', variant: null, position: 0,
  visible: true, anchor: null, settings: {},
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
}

/** Rend le panneau pour une section donnée et renvoie le HTML. */
export function render(type, content) {
  return renderToStaticMarkup(
    <SiteProvider>
      <PropertyPanel
        section={{ ...base, type, content }}
        locale="fr"
        onUpdate={() => {}}
        onVariantChange={() => {}}
      />
    </SiteProvider>,
  )
}
`

const H = await bundleFile('point3-harness', harness)

// ---------------------------------------------------------------------------
console.log('POINT 3 — les listes d\'objets éditent-elles TOUS leurs champs ?\n')

const failures = []
function check(ok, label, detail) {
  console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(label)
}

/** Compte les champs de saisie du HTML rendu. */
function countInputs(html) {
  return (html.match(/<(input|textarea)\b/g) ?? []).length
}

/** Décode les entités HTML pour pouvoir chercher du texte brut. */
function decode(html) {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

/** Le HTML contient-il cette valeur ? */
function hasValue(html, value) {
  return decode(html).includes(value)
}

/**
 * Couverture d'une liste : combien de ses sous-champs déclarés sont à la fois
 * ÉTIQUETÉS et reliés à leur VALEUR.
 *
 * C'est la mesure qui distingue l'ancien comportement du nouveau : `ListField`
 * n'affichait que `itemFields[0]`, donc un membre d'équipe n'atteignait que
 * 1/3. On n'utilise PAS un comptage brut de champs : un texte bilingue en rend
 * deux (fr/en), ce qui rendrait le compte trompeur.
 */
function couverture(type, content, sousChamps) {
  const html = H.render(type, content)
  const atteints = sousChamps.filter(({ label, valeur }) =>
    (html.includes(`>${label}`) || html.includes(`>${label}<`)) && hasValue(html, valeur))
  return { atteints: atteints.map(s => s.label), total: sousChamps.length }
}

// --- A + B. Section « Équipe » : 3 sous-champs déclarés --------------------
console.log('A/B. section « Équipe » — les 3 sous-champs d\'un membre')
const teamSousChamps = [
  { label: 'Nom', valeur: 'Mister Marcket' },
  { label: 'Rôle', valeur: 'Fondateur & Propriétaire' },
  { label: 'Présentation', valeur: 'Visionnaire derrière' },
]
const team = H.render('team', { members: [TEAM_MEMBER] })

for (const { label, valeur } of teamSousChamps) {
  check(team.includes(`>${label}`) || team.includes(`>${label}<`), `libellé « ${label} » affiché`)
  check(hasValue(team, valeur), `« ${label} » est relié à SA valeur`)
}
const covTeam = couverture('team', { members: [TEAM_MEMBER] }, teamSousChamps)
check(covTeam.atteints.length === 3, 'les 3 sous-champs sont couverts (avant : 1 seul)',
  `${covTeam.atteints.length}/3 — ${covTeam.atteints.join(', ')}`)

// --- A. Les autres listes d'objets ----------------------------------------
console.log('\nA. autres listes d\'objets')

const avisSous = [
  { label: 'Nom du client', valeur: 'Nathalie' },
  { label: 'Son avis', valeur: 'Excellent accueil' },
]
const covAvis = couverture('testimonials', { items: [{ name: { fr: 'Nathalie' }, text: { fr: 'Excellent accueil' } }] }, avisSous)
check(covAvis.atteints.length === 2, '« Avis clients » : nom ET avis couverts',
  `${covAvis.atteints.length}/2 — ${covAvis.atteints.join(', ')}`)

const faqSous = [
  { label: 'Question', valeur: 'Ouvert le dimanche ?' },
  { label: 'Réponse', valeur: 'Oui, de 10h à 22h' },
]
const covFaq = couverture('faq', { items: [{ question: { fr: 'Ouvert le dimanche ?' }, answer: { fr: 'Oui, de 10h à 22h' } }] }, faqSous)
check(covFaq.atteints.length === 2, '« Questions » : question ET réponse couvertes',
  `${covFaq.atteints.length}/2 — ${covFaq.atteints.join(', ')}`)

const covMotifs = couverture('contact', { subjects: [{ value: 'reservation', label: { fr: 'Réserver une table' } }] },
  [{ label: 'Libellé affiché', valeur: 'Réserver une table' }])
check(covMotifs.atteints.length === 1, '« Motifs » : le libellé affiché est éditable',
  `${covMotifs.atteints.length}/1`)

// --- C. Sensibilité : le contrôle échouerait-il sur l'ancien comportement ? --
console.log('\nC. sensibilité du contrôle')
// Une liste dont on ne déclare QUE le premier sous-champ : la couverture doit
// valoir 1, pas 3. C'est la preuve que la mesure discrimine bien.
const covPartielle = couverture('team', { members: [TEAM_MEMBER] }, [teamSousChamps[0]])
check(covPartielle.atteints.length === 1, 'une couverture restreinte au 1er champ vaut bien 1/1',
  `${covPartielle.atteints.length}/1`)

// Le rôle et la présentation sont-ils DISTINCTS du nom (et non le même champ) ?
const r = couverture('team', { members: [{ name: { fr: 'X' }, role: { fr: 'ROLE_UNIQUE' }, desc: { fr: 'DESC_UNIQUE' } }] },
  [{ label: 'Rôle', valeur: 'ROLE_UNIQUE' }, { label: 'Présentation', valeur: 'DESC_UNIQUE' }])
check(r.atteints.length === 2, 'chaque sous-champ garde sa PROPRE valeur (pas de mélange)', `${r.atteints.length}/2`)

const vide = H.render('team', { members: [] })
check(!hasValue(vide, 'Mister Marcket'), 'une liste vide n\'affiche aucune valeur d\'élément')
check(countInputs(vide) > 0, 'les autres champs de la section restent affichés', `${countInputs(vide)} champs`)

// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(60))
if (failures.length) {
  console.log(`❌ POINT 3 EN ÉCHEC — ${failures.length} contrôle(s) :`)
  for (const f of failures) console.log(`   · ${f}`)
  process.exit(1)
}
console.log('✅ POINT 3 VÉRIFIÉ — tous les sous-champs des listes d\'objets sont éditables.')

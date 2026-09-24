/**
 * CONTRÔLE DES LIENS DU SITE PUBLIC — LECTURE SEULE.
 *
 * CE QU'IL VÉRIFIE, ET CONTRE QUOI
 * Les ancres ÉCRITES dans le site (listes du menu, du pied de page, et cibles
 * ÉDITABLES des boutons de la page d'accueil) doivent correspondre aux ancres
 * RÉELLEMENT SERVIES au public.
 *
 * Et « réellement servies » veut dire : lues dans `pages.published_snapshot` —
 * la source que le public reçoit, prouvée par `npm run verify:public`. C'est le
 * durcissement majeur de la revue du 2026-09-20 (I-2) : la version précédente
 * lisait `page_sections`, c'est-à-dire le BROUILLON, en supposant qu'il
 * coïncidait avec ce qui est publié. Aucune divergence aujourd'hui (mesuré :
 * même ensemble des deux côtés), mais le filet concluait juste pour une raison
 * fausse — et une section masquée sans republication l'aurait fait mentir.
 *
 * HISTORIQUE DES DÉFAUTS QU'IL TRAQUE
 *  - `Footer.tsx` dérivait ses ancres du libellé affiché : 'La carte' → #lacarte
 *    (l'ancre réelle est `carte`), 'Équipe' → #équipe (l'ancre est `equipe`).
 *    Deux liens sur cinq étaient morts, et rien ne le voyait : `verify:lot1`
 *    compare le rendu des 10 SECTIONS, et le pied de page n'en fait pas partie.
 *  - Les listes étaient ensuite en dur dans Footer (`NAV_LINKS`) et PublicNav
 *    (`links` / `linkIds`). Elles ont migré vers `LIENS_PIED_DEFAUT` /
 *    `LIENS_ENTETE_DEFAUT` dans `site-chrome.ts` (prop `liens` + `hrefLien`).
 *    Le filet lit désormais CES constantes — pas les anciens symboles.
 *  - Le pied de page recopiait les coordonnées du restaurant, dont une valeur
 *    CANONIQUE. La règle cherchait « Kaloum » — l'ANCIENNE valeur : faux vert.
 *  - Les cibles des boutons du Hero viennent du CONTENU ÉDITABLE et n'étaient
 *    vérifiées par rien (revue du 2026-09-20, I-3).
 *
 * Usage : node scripts/verify-anchors.mjs   (ou `npm run verify:anchors`)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const ENV = {}
for (const line of readFileSync(`${ROOT}/.env`, 'utf8').split(/\r?\n/)) {
  if (line.includes('=') && !line.startsWith('#')) {
    const i = line.indexOf('=')
    ENV[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
}
const URL_BASE = ENV.VITE_SUPABASE_URL
const SVC = ENV.NEW_SERVICE_ROLE_KEY
if (!URL_BASE || !SVC) throw new Error('Variables Supabase manquantes dans .env')

// --------------------------------------------------------------- utilitaires

/** `anchorHref` du dépôt : une cible sans `#` devient une ancre, une URL reste une URL. */
function estUrl(cible) {
  return /^[a-z][a-z0-9+.-]*:/i.test(cible)
}

/**
 * Retire un commentaire de fin de ligne SANS toucher aux `//` d'un littéral.
 * Une regex `/\/\/.*$/` tronquerait une URL (`https://…`) et ferait disparaître
 * du code réel du champ de contrôle.
 */
function sansCommentaireDeLigne(ligne) {
  let guillemet = null
  for (let i = 0; i < ligne.length; i++) {
    const c = ligne[i]
    if (guillemet) {
      if (c === '\\') { i++; continue }
      if (c === guillemet) guillemet = null
      continue
    }
    if (c === "'" || c === '"' || c === '`') { guillemet = c; continue }
    if (c === '/' && ligne[i + 1] === '/') return ligne.slice(0, i)
  }
  return ligne
}

/**
 * Le CODE d'un fichier, débarrassé de ce qui n'en est pas : commentaires et
 * lignes `import`. Ce n'est pas cosmétique — ce fichier DOCUMENTE les défauts
 * qu'il traque (« +224 620 00 00 00 », « Kaloum ») : sans cette coupe, le
 * contrôle échouerait sur sa propre explication, et le réflexe serait de retirer
 * l'explication plutôt que de garder le filet.
 */
function codeSeul(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !/^\s*import\b/.test(l))
    .map(sansCommentaireDeLigne)
    .join('\n')
}

/**
 * Contenu d'un tableau DÉCLARÉ (`const NOM = [ … ]` ou `export const NOM = [ … ]`).
 * On part de l'ASSIGNATION : le type peut contenir des crochets
 * (`readonly Omit<…>[]`), et s'y arrêter faisait rendre le contenu du TYPE
 * au lieu de celui de la liste — un bloc vide, donc « 0 ancre », donc un
 * échec trompeur sur un fichier correct.
 * Si la valeur n'est pas un tableau, on rend une chaîne vide : la garde
 * anti-vide fera son travail.
 */
function blocDeclare(source, nom) {
  const m = new RegExp(`(?:export\\s+)?const\\s+${nom}\\b`).exec(source)
  if (!m) return ''
  const egal = source.indexOf('=', m.index)
  if (egal === -1) return ''
  let j = egal + 1
  while (j < source.length && /\s/.test(source[j])) j++
  if (source[j] !== '[') return ''
  let profondeur = 0
  for (let k = j; k < source.length; k++) {
    if (source[k] === '[') profondeur++
    else if (source[k] === ']') {
      profondeur--
      if (profondeur === 0) return source.slice(j, k + 1)
    }
  }
  return ''
}

/**
 * Cible d'un lien chrome utilisable comme ancre de page (hors téléphone / URL).
 * Aligné sur le filtre de PublicNav (`linkIds`) et sur `hrefLien`.
 */
function estAncrePage(cible) {
  if (typeof cible !== 'string' || !cible.trim()) return false
  const id = cible.trim().replace(/^#/, '')
  if (!id || id === 'phone' || id === 'tel') return false
  if (estUrl(id) || id.startsWith('tel') || id.startsWith('/') || id.startsWith('http')) return false
  return true
}

/**
 * Ancres des listes de repli CMS (`LIENS_ENTETE_DEFAUT` / `LIENS_PIED_DEFAUT`).
 * Source de vérité depuis le passage au chrome éditable : Footer et PublicNav
 * consomment ces constantes via la prop `liens`, plus de `NAV_LINKS` / `links`.
 */
function ancresDepuisLiensDefaut(source, nomConstante) {
  const corps = codeSeul(source)
  const bloc = blocDeclare(corps, nomConstante)
  if (!bloc) return []
  const cibles = [...bloc.matchAll(/\btarget:\s*'([^']+)'/g)].map((m) => m[1].replace(/^#/, ''))
  return [...new Set(cibles.filter(estAncrePage))]
}

/** Constantes de repli d'un composant : `const NOM = 'valeur'`. */
function constante(source, nom) {
  const m = new RegExp(`const\\s+${nom}\\s*=\\s*'([^']+)'`).exec(codeSeul(source))
  return m ? m[1] : null
}

/**
 * Valeurs de coordonnées recopiées dans le code.
 * `name` est VOLONTAIREMENT exclu : la marque s'affiche légitimement. Les quatre
 * autres clés sont celles que le restaurateur règle dans l'administration : elles
 * ne doivent exister qu'à un seul endroit (TDR §16).
 */
const CLES_COORDONNEES = ['address', 'phone', 'emailContact', 'hours']
const VALEURS_PERIMEES = [
  { quoi: 'une ancienne adresse', motif: /\bKaloum\b/ },
  { quoi: 'un ancien numéro', motif: /\+224\s*620/ },
]

function textesDe(valeur) {
  if (typeof valeur === 'string') return [valeur]
  if (valeur && typeof valeur === 'object') return Object.values(valeur).flatMap(textesDe)
  return []
}

function coordonneesEnDur(source, canoniques) {
  const corps = codeSeul(source)
  const trouvees = []
  for (const valeur of canoniques) {
    if (corps.includes(valeur)) trouvees.push(`la valeur canonique « ${valeur} »`)
  }
  for (const { quoi, motif } of VALEURS_PERIMEES) {
    if (motif.test(corps)) trouvees.push(quoi)
  }
  return trouvees
}

/** Tous les fichiers `.tsx`/`.ts` d'un dossier, récursivement. */
function fichiersSource(dossier) {
  const out = []
  for (const nom of readdirSync(dossier)) {
    const complet = join(dossier, nom)
    if (statSync(complet).isDirectory()) out.push(...fichiersSource(complet))
    else if (/\.tsx?$/.test(nom)) out.push(complet)
  }
  return out
}

// ---------------------------------------------------------------- lecture base
async function lecture(path) {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    headers: { apikey: SVC, Authorization: `Bearer ${SVC}` },
  })
  const t = await r.text()
  if (!r.ok) throw new Error(`GET ${path} -> ${r.status} :: ${t.slice(0, 200)}`)
  return t ? JSON.parse(t) : null
}

// ================================================ A. ancres REELLEMENT SERVIES
const pages = await lecture('pages?select=slug,status,published_at,published_snapshot')
const publiee = (pages ?? []).find((p) => p.status === 'published' && p.published_snapshot)

console.log('='.repeat(72))
console.log('A. LES ANCRES REELLEMENT SERVIES — lues dans l’instantané publié')
console.log('='.repeat(72))

let reelles = []
if (!publiee) {
  console.log('  ECHEC : aucune page publiée avec instantané. Le contrôle ne peut rien prouver.')
  process.exitCode = 1
} else {
  const sections = publiee.published_snapshot.sections ?? []
  const visibles = sections.filter((s) => s.visible !== false)
  reelles = [...new Set(visibles.map((s) => s.anchor).filter((a) => typeof a === 'string' && a))].sort()
  const masquees = [...new Set(sections.filter((s) => s.visible === false).map((s) => s.anchor).filter(Boolean))]

  console.log(`  page « ${publiee.slug || '(racine)'} » · publiée le ${publiee.published_at} · format v${publiee.published_snapshot.formatVersion}`)
  console.log(`  ${reelles.length} ancres servies par ${visibles.length} sections visibles :`)
  console.log(`    ${reelles.join(', ')}`)
  if (masquees.length > 0) {
    console.log(`  ${masquees.length} ancre(s) de sections masquées, EXCLUES : ${masquees.join(', ')}`)
    console.log('    -> un lien vers celles-là ne mène nulle part : le public ne les reçoit pas.')
  }
  if (reelles.length === 0) {
    console.log('  ECHEC : aucune ancre servie, le contrôle ne peut rien prouver.')
    process.exitCode = 1
  }
}

// ============================================ B. liens ECRITS dans le site
/**
 * Source de vérité : gabarits chrome CMS (`site-chrome.ts`).
 * Footer / PublicNav les appliquent via `liens` + `hrefLien` — on vérifie aussi
 * que chaque consommateur importe encore sa constante (sinon le filet passerait
 * sur un gabarit mort).
 */
const CHROME_PATH = 'src/cms/model/sections/site-chrome.ts'
const DEFAUTS_CHROME = [
  {
    nom: 'Pied de page (LIENS_PIED_DEFAUT)',
    constante: 'LIENS_PIED_DEFAUT',
    minimum: 2,
    consommateur: { nom: 'Footer', chemin: 'src/sections/Footer.tsx', symbole: 'LIENS_PIED_DEFAUT' },
  },
  {
    nom: 'Barre de navigation (LIENS_ENTETE_DEFAUT)',
    constante: 'LIENS_ENTETE_DEFAUT',
    minimum: 2,
    consommateur: { nom: 'PublicNav', chemin: 'src/components/nav/PublicNav.tsx', symbole: 'LIENS_ENTETE_DEFAUT' },
  },
]

console.log('\n' + '='.repeat(72))
console.log('B. LES LIENS ÉCRITS DANS LE CADRE DU SITE (chrome CMS)')
console.log('='.repeat(72))

let fautif = false
const sources = {
  [CHROME_PATH]: readFileSync(`${ROOT}/${CHROME_PATH}`, 'utf8'),
  'src/sections/Footer.tsx': readFileSync(`${ROOT}/src/sections/Footer.tsx`, 'utf8'),
  'src/components/nav/PublicNav.tsx': readFileSync(`${ROOT}/src/components/nav/PublicNav.tsx`, 'utf8'),
}

for (const c of DEFAUTS_CHROME) {
  const utilisees = ancresDepuisLiensDefaut(sources[CHROME_PATH], c.constante)
  console.log(`  ${c.nom} : ${utilisees.length > 0 ? utilisees.join(', ') : '(aucune)'}`)

  if (utilisees.length < c.minimum) {
    console.log(`    ECHEC : ${utilisees.length} ancre(s) extraite(s), ${c.minimum} attendues.`)
    console.log("    L'extraction ne trouve plus la liste : le contrôle ne vérifie RIEN.")
    fautif = true
    continue
  }
  const inconnues = utilisees.filter((a) => !reelles.includes(a))
  if (inconnues.length > 0) {
    console.log(`    ECHEC : ancre(s) inexistante(s) -> ${inconnues.join(', ')}`)
    fautif = true
  } else {
    console.log('    toutes mènent à une section réellement servie')
  }

  const srcConso = sources[c.consommateur.chemin]
  const importe = new RegExp(`\\b${c.consommateur.symbole}\\b`).test(codeSeul(srcConso))
  const utiliseHref = /\bhrefLien\b/.test(codeSeul(srcConso))
  if (!importe || !utiliseHref) {
    console.log(`    ECHEC : ${c.consommateur.nom} ne consomme plus ${c.consommateur.symbole}/hrefLien`)
    console.log('    (le gabarit serait vérifié sans être branché au rendu public).')
    fautif = true
  } else {
    console.log(`    ${c.consommateur.nom} consomme ${c.consommateur.symbole} + hrefLien`)
  }
}

// ==================================== C. cibles EDITABLES des boutons du Hero
console.log('\n' + '='.repeat(72))
console.log('C. LES CIBLES ÉDITABLES DES BOUTONS DE LA PAGE D’ACCUEIL')
console.log('='.repeat(72))

const HERO = `${ROOT}/src/sections/Hero.tsx`
const sourceHero = readFileSync(HERO, 'utf8')
const heroPublication = publiee
  ? (publiee.published_snapshot.sections ?? []).find((s) => s.type === 'hero' && s.visible !== false)
  : null

/**
 * Confronte les cibles ÉDITABLES des boutons du Hero aux ancres servies.
 *
 * POURQUOI C'EST UNE FONCTION, ET PAS DU CODE EN LIGNE
 * La première version du test de sensibilité se contentait de vérifier qu'une
 * chaîne inventée n'était pas dans la liste des ancres — sans jamais APPELER le
 * contrôle. Sa mutation l'a prouvé : supprimer la boucle du contrôle laissait le
 * test afficher « OUI ». Le test ne testait rien (revue du 2026-09-20, B2).
 * Ici, le rapport et le test de sensibilité exercent le MÊME code.
 *
 * Rend une ligne par cible : `{ quoi, origine, cible, ok, externe }`.
 */
function analyserCiblesHero(reelles, cibles) {
  const lignes = []
  for (const { quoi, valeur, repli } of cibles) {
    for (const [origine, cible] of [['contenu publié', valeur], ['repli du code', repli]]) {
      if (typeof cible !== 'string' || cible === '') {
        lignes.push({ quoi, origine, cible: null, ok: true, externe: false })
        continue
      }
      const externe = estUrl(cible)
      lignes.push({
        quoi,
        origine,
        cible,
        externe,
        ok: externe || reelles.includes(cible.replace(/^#/, '')),
      })
    }
  }
  return lignes
}

/*
  Ce sont les SEULES cibles qui viennent du CONTENU, et non du code : le
  restaurateur les saisit dans « Destination », un champ TEXTE LIBRE. Rien
  n'empêche une faute de frappe, et le bouton ne mène alors nulle part — sans
  aucun avertissement (revue du 2026-09-20, I-3).
*/
const LIGNES_HERO = analyserCiblesHero(reelles, [
  { quoi: 'Bouton principal', valeur: heroPublication?.content?.primaryCta?.target, repli: constante(sourceHero, 'LEGACY_PRIMARY_TARGET') },
  { quoi: 'Bouton secondaire', valeur: heroPublication?.content?.secondaryCta?.target, repli: constante(sourceHero, 'LEGACY_SECONDARY_TARGET') },
])

if (!heroPublication) {
  console.log('  (aucune section « hero » visible dans l’instantané publié)')
}
for (const ligne of LIGNES_HERO) {
  if (ligne.cible === null) {
    console.log(`  ${ligne.quoi} — ${ligne.origine} : (absent)`)
    continue
  }
  if (ligne.externe) {
    console.log(`  ${ligne.quoi} — ${ligne.origine} : « ${ligne.cible} » (adresse externe, hors ancres)`)
    continue
  }
  console.log(`  ${ligne.quoi} — ${ligne.origine} : « ${ligne.cible} » ${ligne.ok ? 'existe' : 'N’EXISTE PAS'}`)
  if (!ligne.ok) {
    console.log('    ECHEC : ce bouton ne mène nulle part (faute de frappe dans « Destination » ?)')
    fautif = true
  }
}

if (fautif) process.exitCode = 1

// ======================== D. coordonnees recopiees dans un composant PUBLIC
const DOSSIERS_PUBLICS = ['src/sections', 'src/components'].map((d) => `${ROOT}/${d}`)
const fichiersPublics = DOSSIERS_PUBLICS.flatMap((d) => fichiersSource(d))

const reglages = await lecture('site_content?select=value&key=eq.restaurant')
const restaurant = reglages?.[0]?.value ?? {}
const canoniques = CLES_COORDONNEES.flatMap((cle) => textesDe(restaurant[cle]))
  .map((t) => t.trim())
  .filter((t) => t.length >= 5)

console.log('\n' + '='.repeat(72))
console.log('D. COORDONNÉES RECOPIÉES DANS UN COMPOSANT DU SITE (TDR §16)')
console.log('='.repeat(72))
console.log(`  ${fichiersPublics.length} fichiers publics balayés (src/sections, src/components)`)
console.log(`  ${canoniques.length} valeurs canoniques épiées, lues en base :`)
for (const v of canoniques) console.log(`    « ${v} »`)

if (canoniques.length === 0) {
  console.log('  ECHEC : aucune valeur canonique lue, le contrôle ne peut rien prouver.')
  process.exitCode = 1
}
if (fichiersPublics.length < 10) {
  // Sans ce plancher, un chemin de dossier erroné ferait « passer » le contrôle
  // en ne balayant rien — le faux vert le plus silencieux.
  console.log(`  ECHEC : seulement ${fichiersPublics.length} fichiers balayés, 10 attendus au minimum.`)
  process.exitCode = 1
}

const avecCoordonnees = []
for (const fichier of fichiersPublics) {
  const trouvees = coordonneesEnDur(readFileSync(fichier, 'utf8'), canoniques)
  if (trouvees.length > 0) avecCoordonnees.push(`${relative(ROOT, fichier).replace(/\\/g, '/')} → ${trouvees.join(', ')}`)
}
if (avecCoordonnees.length > 0) {
  console.log('\n  ECHEC : coordonnées recopiées en dur.')
  for (const ligne of avecCoordonnees) console.log(`    ${ligne}`)
  console.log('  La source unique est `site_content.restaurant`.')
  process.exitCode = 1
} else {
  console.log('\n  aucune coordonnée en dur dans les composants du site')
}

// ============================================================= E. sensibilite
console.log('\n' + '='.repeat(72))
console.log('E. SENSIBILITÉ — ce contrôle sait-il dire NON ?')
console.log('='.repeat(72))

const mesurer = (nom, condition) => {
  console.log(`  ${nom} : ${condition ? 'OUI' : 'NON'}`)
  if (!condition) process.exitCode = 1
}

const FOOTER = sources['src/sections/Footer.tsx']
const CHROME = sources[CHROME_PATH]
const TETE_PIED = /export const LIENS_PIED_DEFAUT[^\n]*\n/
const CONST_PIED = DEFAUTS_CHROME[0].constante
const MIN_PIED = DEFAUTS_CHROME[0].minimum

const avecAncreFausse = CHROME.replace(
  TETE_PIED,
  "export const LIENS_PIED_DEFAUT = [\n  { id: 'faux', label: { fr: 'Faux', en: 'Fake' }, target: 'ancre-qui-nexiste-pas', visible: true, isCta: false },\n",
)
mesurer(
  'une ancre inventée est détectée',
  ancresDepuisLiensDefaut(avecAncreFausse, CONST_PIED).some((a) => !reelles.includes(a)),
)

const avecDefautOrigine = CHROME.replace(
  TETE_PIED,
  "export const LIENS_PIED_DEFAUT = [\n  { id: 'carte', label: { fr: 'La carte', en: 'Menu' }, target: 'lacarte', visible: true, isCta: false },\n  { id: 'equipe', label: { fr: 'Équipe', en: 'Team' }, target: 'équipe', visible: true, isCta: false },\n",
)
const manquantes = ancresDepuisLiensDefaut(avecDefautOrigine, CONST_PIED).filter((a) => !reelles.includes(a))
mesurer(`le défaut d’origine (#lacarte, #équipe) est détecté — ${manquantes.join(', ')}`, manquantes.length === 2)

const adresse = textesDe(restaurant.address)[0] ?? ''
// Le copyright n’est plus un littéral « © 2026 Greatlife · » : année dynamique +
// nom du restaurant. On injecte l’adresse dans une chaîne réellement présente.
const avecAdresse = FOOTER.replace(
  '© {new Date().getFullYear()}',
  `© Copyright ${adresse} · {new Date().getFullYear()}`,
)
mesurer(`la valeur canonique de l’adresse (« ${adresse} ») est détectée`, coordonneesEnDur(avecAdresse, canoniques).length > 0)

const avecTelephone = FOOTER.replace('{coordonnees.map(', '{["+224 620 00 00 00"].map(')
mesurer('un ancien numéro en dur est détecté', coordonneesEnDur(avecTelephone, canoniques).length > 0)

const refonte = CHROME.replace(TETE_PIED, 'export const LIENS_PIED_DEFAUT = { carte: 1, blog: 1 }\n')
mesurer(
  'une refonte qui fait disparaître la liste est détectée (pas de vert sur du vide)',
  ancresDepuisLiensDefaut(refonte, CONST_PIED).length < MIN_PIED,
)

// Cible de Hero fausse : c'est le contrôle NOUVEAU, il doit mordre — et la
// sensibilité exerce désormais la MÊME fonction que le rapport (revue B2).
const heroFaux = analyserCiblesHero(reelles, [
  { quoi: 'Bouton principal', valeur: 'cible-qui-nexiste-pas', repli: null },
])
mesurer(
  'une cible de bouton inventée est détectée par le contrôle lui-même',
  heroFaux.some((l) => !l.ok),
)
// Témoin : avec une cible VALIDE, la même fonction ne signale rien — sinon le
// « OUI » ci-dessus ne prouverait qu'une fonction qui dit toujours non.
const heroJuste = analyserCiblesHero(reelles, [
  { quoi: 'Bouton principal', valeur: reelles[0], repli: null },
])
mesurer('et une cible valide ne déclenche rien', heroJuste.every((l) => l.ok))

console.log('\n' + '='.repeat(72))
console.log(process.exitCode ? 'ECHEC — voir les lignes ci-dessus.' : 'LIENS DU SITE PUBLIC VÉRIFIÉS.')
console.log("AUCUNE ÉCRITURE N'A ÉTÉ EFFECTUÉE — cette sonde ne fait que lire.")
console.log('='.repeat(72))

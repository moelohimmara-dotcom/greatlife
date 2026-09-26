/**
 * VÉRIFICATION DE LA COQUILLE DE LA CONSOLE — lecture statique, aucune base.
 *
 * POURQUOI CE FILET EXISTE
 * La coquille de la console « barre fixe + contenu défilant » ne fonctionnait
 * PAS, et rien ne le disait. Mesuré en production le 2026-09-21, fenêtre de
 * 674 px de haut :
 *   - la barre latérale faisait 1179 px, parfois 1451 px ;
 *   - le bloc « Connecté en tant que / Déconnexion / Voir le site » était hors
 *     écran, donc la déconnexion était inatteignable ;
 *   - `window.scrollTo(0, 400)` faisait passer le haut de la barre de 0 à
 *     −400 px : elle défilait avec la page ;
 *   - `main.scrollTop = 400` restait à 0 : le bloc principal ne défilait pas,
 *     contrairement à ce que son `overflow: auto` annonçait.
 *
 * La cause est une règle CSS qu'on ne voit pas en lisant : un enfant de grille
 * ou de flex a pour taille minimale la taille de son CONTENU (`min-height:
 * auto`). Sans `minHeight: 0`, `overflow: auto` ne peut jamais s'activer — le
 * parent grandit à la place, la ligne de grille grandit, le document grandit,
 * et c'est le document qui défile en emportant la barre.
 *
 * CE QU'IL PROUVE
 *   - la coquille est collée au viewport (`position: fixed` + `inset: 0`) et
 *     ne défile pas ;
 *   - les deux grilles ont des lignes bornées (`minmax(0, 1fr)`) — sans quoi le
 *     contenu serait ROGNÉ au lieu de défiler ;
 *   - `main`, la barre, son enveloppe et son `nav` portent tous `minHeight: 0` ;
 *   - le défaut d'origine (`minHeight: '100vh'` sur `main`) ne peut pas revenir ;
 *   - la vérification DISCRIMINE : rejouée sur une source où le défaut est
 *     réintroduit, elle ROUGIT.
 *
 * CE QU'IL NE PROUVE PAS
 *   - que le rendu réel est correct : c'est une lecture de source. Le rendu a
 *     été vérifié séparément au navigateur, à plusieurs hauteurs de fenêtre
 *     (voir `docs/22_DIAGNOSTIC_CONSOLE.md` §4). Ce filet empêche la
 *     régression, il ne remplace pas la mesure.
 *
 * Usage : npm run verify:coquille
 *         npm run verify:coquille -- --sensibilite
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
/* Shell extrait de AdminPanel.tsx → AdminShell.tsx (routes /admin/*). */
const FICHIER = `${ROOT}/src/admin/AdminShell.tsx`
const source = readFileSync(FICHIER, 'utf8')

/*
  ON VÉRIFIE LE CODE, JAMAIS LES COMMENTAIRES.

  Défaut de ce filet à sa première écriture : le contrôle « aucun
  `minHeight: '100vh'` ne subsiste » lisait le commentaire qui EXPLIQUE le
  défaut (« CAUSE. `main` portait `minHeight: '100vh'`… ») et échouait donc sur
  sa propre documentation. De même, la recherche de la coquille tombait sur la
  ligne de commentaire qui mentionne `...rootStyle`.

  On retire donc les commentaires `/* … *​/` et les lignes qui commencent par
  `*` ou `//` avant tout contrôle. On ne retire PAS les `//` en milieu de ligne :
  cela casserait les URL (`https://…`).
*/
const sansCommentaires = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => {
      const t = l.trim()
      return !t.startsWith('*') && !t.startsWith('//')
    })
    .join('\n')

const code = sansCommentaires(source)

/** Une contrainte de la coquille, exprimée sur le source. */
const CONTRAINTES = [
  {
    id: 'bornage-fenetre',
    quoi: 'la coquille est collée au viewport (fixed + inset) et ne défile pas',
    defaut: "la coquille grandit avec son contenu, donc le document défile et emporte la barre",
    casse: (s) => s.replace(/position: 'fixed',\s*inset: 0,/, "position: 'relative',"),
    tient: (s) => {
      /*
        Bloc de la coquille : on s'ancre sur l'élément PORTEUSE, jamais sur un
        spread du style. Le `...rootStyle` de l'époque a été retiré par a931ece
        (2026-09-24) pour isoler les jetons console de l'aperçu — le filet
        continuait à l'exiger et rougissait sur un code pourtant conforme
        (dérive mesurée le 2026-09-26). La contrainte réelle, elle, n'a pas
        bougé : la coquille porte fixed + inset + overflow hidden.
      */
      const i = s.indexOf('data-admin-shell')
      if (i < 0) return false
      const bloc = s.slice(i, i + 800)
      return bloc.includes("position: 'fixed'") && bloc.includes('inset: 0') && bloc.includes("overflow: 'hidden'")
    },
  },
  {
    id: 'lignes-bornees',
    quoi: 'les deux grilles bornent leur ligne (minmax(0, 1fr))',
    defaut: 'la ligne reste `auto` : le contenu est ROGNÉ au lieu de défiler',
    casse: (s) => s.replaceAll("gridTemplateRows: 'minmax(0, 1fr)'", "gridTemplateRows: 'auto'"),
    tient: (s) => (s.match(/gridTemplateRows: 'minmax\(0, 1fr\)'/g) || []).length >= 2,
  },
  {
    id: 'pas-de-100vh',
    quoi: "aucun `minHeight: '100vh'` ne subsiste dans la console",
    defaut: "`main` portait `minHeight: '100vh'` : son contenu grandissait au-delà de la fenêtre",
    casse: (s) => s.replace('          minHeight: 0,', "          minHeight: '100vh',"),
    tient: (s) => !/minHeight:\s*'100vh'/.test(s),
  },
  {
    id: 'main-borne',
    quoi: 'le bloc principal est borné (minHeight: 0)',
    defaut: "sans borne, main impose sa hauteur de contenu et rien ne défile à l'intérieur",
    casse: (s) => s.replace('          minHeight: 0,', '          minHeight: 400,'),
    tient: (s) => /<main[\s\S]{0,400}?minHeight: 0,/.test(s),
  },
  {
    id: 'barre-bornee',
    quoi: "l'`aside` et son `nav` sont bornés (minHeight: 0)",
    defaut: "le `nav` s'allonge au lieu de défiler : la barre fait 1179 px pour 674 px de fenêtre",
    casse: (s) => s.replace("column', height: '100%', minHeight: 0 }}", "column', height: '100%' }}"),
    tient: (s) => /<aside[\s\S]{0,300}?minHeight: 0 \}/.test(s) && /<nav[\s\S]{0,300}?minHeight: 0/.test(s),
  },
  {
    id: 'nav-defile',
    quoi: 'le `nav` défile dans sa propre colonne',
    defaut: 'sans `overflow: auto` sur le nav, les entrées basses deviennent inatteignables',
    casse: (s) => s.replace("flex: 1, overflow: 'auto', minHeight: 0 }}", "flex: 1, minHeight: 0 }}"),
    tient: (s) => /<nav[\s\S]{0,300}?overflow: 'auto'/.test(s),
  },
  {
    id: 'enveloppe-bornee',
    quoi: "l'enveloppe de la barre est bornée",
    defaut: "l'enveloppe (item de grille) grandit à la taille de la barre et annule le bornage",
    casse: (s) => s.replace(
      'className="admin-sidebar-desktop" style={{ height: \'100%\', minHeight: 0, overflow: \'hidden\' }}',
      'className="admin-sidebar-desktop" style={{ height: \'100%\', overflow: \'hidden\' }}',
    ),
    tient: (s) => /admin-sidebar-desktop" style=\{\{[\s\S]{0,120}?minHeight: 0/.test(s),
  },
]

/** Applique toutes les contraintes au CODE ; renvoie celles qui NE tiennent PAS. */
function echecs(texteCode) {
  return CONTRAINTES.filter((c) => {
    try { return !c.tient(texteCode) } catch { return true }
  })
}

const restants = echecs(code)

console.log('='.repeat(70))
console.log('COQUILLE DE LA CONSOLE — bornée à la fenêtre, un seul bloc défilant')
console.log('='.repeat(70))
for (const c of CONTRAINTES) {
  console.log(`  ${c.tient(code) ? '[OK]  ' : '[ÉCHEC]'} ${c.id} — ${c.quoi}`)
}
console.log('='.repeat(70))
console.log(`AUCUNE ÉCRITURE : ce filet ne lit que du code (${FICHIER.replace(ROOT, '.')}).`)

if (process.argv.includes('--sensibilite')) {
  console.log()
  console.log('SENSIBILITÉ — on réintroduit chaque défaut et le filet doit ROUGIR')
  let toutesRouges = true
  for (const c of CONTRAINTES) {
    const mute = c.casse(source)
    if (mute === source) {
      toutesRouges = false
      console.log(`  [KO]    ${c.id} : la mutation n'a rien changé — la sensibilité n'est pas prouvée`)
      continue
    }
    const detecte = echecs(sansCommentaires(mute)).some((e) => e.id === c.id)
    if (!detecte) toutesRouges = false
    console.log(`  ${detecte ? '[ROUGE]' : '[KO]   '} ${c.id} — défaut réintroduit : ${c.defaut}`)
  }
  console.log('='.repeat(70))
  if (!toutesRouges) {
    console.log('SENSIBILITÉ : NON — au moins une contrainte ne détecte pas son défaut.')
    process.exit(1)
  }
  console.log('SENSIBILITÉ : OUI — les 7 contraintes rougissent quand leur défaut revient.')
}

if (restants.length > 0) {
  console.log()
  console.log(`ÉCHEC : ${restants.length} contrainte(s) de coquille non tenue(s) :`)
  for (const c of restants) console.log(`  - ${c.id} : ${c.quoi}\n      défaut que cela produit : ${c.defaut}`)
  process.exit(1)
}

console.log('COQUILLE CONFORME — la barre est bornée, le principal est le seul bloc défilant.')
process.exit(0)

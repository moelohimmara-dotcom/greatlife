/**
 * TEST DE L'IDENTITÉ DU RESTAURANT — noyau pur, aucune base de données.
 *
 * POURQUOI CE TEST EXISTE
 * Les coordonnées du restaurant vivaient à DEUX endroits (`site_content`
 * clé `restaurant`, et le plat historique `site_config`). Mesuré le 2026-09-20 :
 * l'écran de réglages lisait une copie VIDE, et `saveContent` réécrivait les
 * cinq coordonnées depuis cette copie — un champ laissé vide écrasait donc la
 * valeur publiée. Le restaurateur saisissait son numéro, l'écran disait
 * « Enregistré », et le site continuait d'afficher l'ancien.
 *
 * CE QU'IL PROUVE
 *   - la règle de source unique tient : une clé DÉJÀ remplie dans la ligne
 *     canonique `restaurant` n'est jamais écrasée par le plat `site_config`
 *     (c'est le défaut d'origine) ;
 *   - le repli fonctionne : une clé vide ou faite d'espaces est bien
 *     complétée par le plat — sinon la migration perdrait l'historique ;
 *   - une valeur bilingue `{fr, en}` remplie d'un seul côté compte comme
 *     remplie, et `{fr: '', en: ''}` comme vide ;
 *   - l'écran Coordonnées se pré-remplit avec `restaurant` d'abord, le plat
 *     seulement en secours ;
 *   - le noyau DISCRIMINE : il ne répond pas toujours la même chose, et il ne
 *     modifie jamais son entrée.
 *
 * CE QU'IL NE PROUVE PAS
 *   - que les écrans appellent bien ce noyau : cela se vérifie sur l'écran
 *     réel, pas ici.
 *
 * Usage : npm run test:identite
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const WORK = `${ROOT}/node_modules/.cms-verify`
mkdirSync(WORK, { recursive: true })
const require = createRequire(import.meta.url)
const { build } = require('esbuild')

const entry = `${WORK}/identite-restaurant.ts`
const outfile = `${WORK}/identite-restaurant.cjs`
writeFileSync(entry,
  "export { CLES_IDENTITE_CANONIQUES, PLAT_VERS_CANON, completerRestaurantDepuisPlat, platDepuisRestaurant } from '@/cms/model/identite-restaurant'",
  'utf8')
await build({
  entryPoints: [entry], outfile, bundle: true, format: 'cjs', platform: 'node',
  alias: { '@': `${ROOT}/src` }, loader: { '.ts': 'ts' }, logLevel: 'warning',
})
delete require.cache[require.resolve(outfile)]
const { CLES_IDENTITE_CANONIQUES, PLAT_VERS_CANON, completerRestaurantDepuisPlat, platDepuisRestaurant } = require(outfile)

/* ---------------------------------------------------------------------------
   LE DÉFAUT, TEL QU'IL A ÉTÉ MESURÉ.
   La ligne canonique `restaurant` portait le VRAI numéro publié, et le plat
   `site_config` une copie vide. Sauvegarder depuis l'écran écrasait le vrai
   numéro par du vide.
--------------------------------------------------------------------------- */
const restaurantPublie = {
  name: { fr: 'Greatlife' },
  phone: '+224 661 16 44 58',
  address: { fr: 'Conakry, Guinée' },
  emailContact: 'moelohimmara@gmail.com',
  hours: { fr: 'Tous les jours · 11h00 — 23h00' },
}
const platVide = { restaurantName: '', phone: '', address: '', emailContact: '', emailReservation: '', hours: '', slogan: '' }

test('le défaut d\'origine : un plat VIDE n\'écrase jamais la valeur publiée', () => {
  const out = completerRestaurantDepuisPlat(restaurantPublie, platVide)
  assert.equal(out.phone, '+224 661 16 44 58', 'le numéro publié doit survivre à une sauvegarde à champ vide')
  assert.deepEqual(out.name, { fr: 'Greatlife' }, 'le nom bilingue rempli n\'est pas touché non plus')
  assert.deepEqual(out.address, { fr: 'Conakry, Guinée' }, 'ni l\'adresse')
})

test('une valeur DU PLAT ne remplace jamais une valeur déjà remplie', () => {
  const out = completerRestaurantDepuisPlat(restaurantPublie, { phone: '+224 000 00 00 00', restaurantName: 'Autre nom' })
  assert.equal(out.phone, '+224 661 16 44 58', 'la source unique : restaurant gagne')
  assert.deepEqual(out.name, { fr: 'Greatlife' }, 'idem pour le nom')
})

test('le repli : une clé vide de `restaurant` est complétée par le plat', () => {
  const out = completerRestaurantDepuisPlat({ name: { fr: 'Greatlife' } }, {
    restaurantName: 'Inutile', phone: '+224 620 00 00 00', address: 'Kaloum, Conakry',
    emailContact: 'contact@example.org', emailReservation: 'resa@example.org',
    hours: '9h — 22h', slogan: 'Manger bio',
  })
  assert.equal(out.phone, '+224 620 00 00 00', 'le téléphone manquant vient du plat')
  assert.equal(out.address, 'Kaloum, Conakry', 'et l\'adresse aussi')
  assert.equal(out.hours, '9h — 22h', 'et les horaires')
  assert.equal(out.emailContact, 'contact@example.org', 'et le destinataire général')
  assert.equal(out.emailReservation, 'resa@example.org', 'et le destinataire réservations')
  assert.equal(out.slogan, 'Manger bio', 'et le slogan')
  assert.deepEqual(out.name, { fr: 'Greatlife' }, 'le nom déjà rempli reste intact')
})

test('un champ fait d\'ESPACES compte comme vide — sinon l\'écrasement revient', () => {
  const out = completerRestaurantDepuisPlat({ phone: '   ' }, platVide)
  assert.equal(out.phone.trim(), '', 'une valeur d\'espaces reste vide : le plat vide ne l\'écrase pas davantage')
  const rempli = completerRestaurantDepuisPlat({ phone: '   ' }, { phone: '+224 620 11 22 33' })
  assert.equal(rempli.phone, '+224 620 11 22 33', 'mais un plat qui a une valeur complète bien la case')
})

test('une valeur BILINGUE remplie d\'un seul côté compte comme remplie', () => {
  const out = completerRestaurantDepuisPlat({ name: { fr: '', en: 'Greatlife' } }, { restaurantName: 'Ne doit pas passer' })
  assert.deepEqual(out.name, { fr: '', en: 'Greatlife' }, 'l\'anglais seul suffit : la clé n\'est pas vide, donc le plat ne passe pas')
  const vide = completerRestaurantDepuisPlat({ name: { fr: '', en: '' } }, { restaurantName: 'Passe cette fois' })
  assert.equal(vide.name, 'Passe cette fois', 'mais les deux côtés vides laissent passer le repli')
})

test('l\'écran Coordonnées se pré-remplit : `restaurant` d\'abord, le plat en secours', () => {
  const plat = { restaurantName: 'Nom du plat', phone: '+224 000 00 00 00', address: 'Adresse du plat' }
  const depuisPublie = platDepuisRestaurant(restaurantPublie, plat)
  assert.equal(depuisPublie.phone, '+224 661 16 44 58', 'la ligne canonique fournit le numéro')
  assert.equal(depuisPublie.restaurantName, 'Greatlife', 'et le nom (résolu depuis la forme bilingue)')
  const depuisVide = platDepuisRestaurant(null, plat)
  assert.equal(depuisVide.phone, '+224 000 00 00 00', 'sans ligne canonique, le plat sert de secours')
  assert.equal(depuisVide.restaurantName, 'Nom du plat', 'et de secours seulement')
})

test('la table de correspondance couvre bien les clés d\'identité', () => {
  for (const cle of CLES_IDENTITE_CANONIQUES) {
    const sources = Object.entries(PLAT_VERS_CANON).filter(([, cible]) => cible === cle).map(([plat]) => plat)
    assert.ok(sources.length >= 1, `la clé canonique « ${cle} » doit pouvoir être remplie depuis le plat`)
  }
  assert.equal(PLAT_VERS_CANON.restaurantName, 'name', 'le plat historique « restaurantName » est le nom')
  assert.equal(PLAT_VERS_CANON.phone, 'phone')
  assert.equal(PLAT_VERS_CANON.address, 'address')
  assert.equal(PLAT_VERS_CANON.emailContact, 'emailContact')
})

test('le noyau DISCRIMINE : deux entrées différentes rendent deux sorties différentes', () => {
  const a = completerRestaurantDepuisPlat({}, { phone: '+224 620 00 00 01' })
  const b = completerRestaurantDepuisPlat({}, { phone: '+224 620 00 00 02' })
  assert.notEqual(a.phone, b.phone, 'si la fonction répondait toujours pareil, ce test rougirait')
})

test('le noyau est PUR : il ne modifie jamais l\'objet restaurant reçu', () => {
  const entree = { name: { fr: 'Greatlife' } }
  const copie = JSON.parse(JSON.stringify(entree))
  completerRestaurantDepuisPlat(entree, { phone: '+224 620 00 00 03' })
  assert.deepEqual(entree, copie, 'l\'appelant doit pouvoir réutiliser son objet en confiance')
})

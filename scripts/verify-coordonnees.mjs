/**
 * CONTRÔLE DES COORDONNÉES PUBLIÉES — LECTURE SEULE.
 *
 * POURQUOI CE FILET EXISTE (2026-09-20, constats N-9 et N-10)
 * Le site public affichait, sous l'étiquette « Appel & WhatsApp » :
 *     téléphone : +224 000 00 00 00
 *     e-mail    : contact@greatlife.gn
 * Aucun des deux n'atteint personne. Et **rien ne le disait** : ni les 10 filets
 * du dépôt, ni une revue. C'est le genre de défaut qui ne se voit qu'à l'œil
 * d'un humain qui essaie d'appeler — donc jamais assez tôt.
 *
 * PRINCIPE : ON MESURE, ON NE JUGE PAS
 * Impossible de « deviner » qu'une adresse est fausse. Alors on ne devine pas :
 *  - un téléphone dont les chiffres contiennent une longue suite de zéros est un
 *    gabarit (mesuré sur la valeur réelle : `224000000000`) ;
 *  - un e-mail dont le DOMAINE NE RÉSOUT PAS ne peut pas recevoir de courrier —
 *    c'est une propriété du DNS, pas une opinion (mesuré : `greatlife.gn` ->
 *    « le nom DNS n'existe pas », alors que `gmail.com` résout).
 *
 * ⚠️ UNE RÈGLE IMPORTANTE : « invérifiable » n'est PAS « faux ».
 * Si le DNS est injoignable (réseau coupé, timeout), on ne peut RIEN affirmer sur
 * le domaine. Le contrôle le dit et n'échoue PAS. Accuser à tort ferait perdre
 * plus de temps que l'absence de contrôle.
 *
 * Usage : node scripts/verify-coordonnees.mjs   (ou `npm run verify:coordonnees`)
 */
import { readFileSync } from 'node:fs'
import { promisify } from 'node:util'
import { resolveMx, resolve4 } from 'node:dns'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const mx = promisify(resolveMx)
const a = promisify(resolve4)

const ENV = {}
for (const line of readFileSync(`${ROOT}/.env`, 'utf8').split(/\r?\n/)) {
  if (line.includes('=') && !line.startsWith('#')) {
    const i = line.indexOf('=')
    ENV[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
}
if (!ENV.VITE_SUPABASE_URL || !ENV.NEW_SERVICE_ROLE_KEY) {
  throw new Error('Variables Supabase manquantes dans .env')
}

// ------------------------------------------------------------------ les règles

/** Applati une valeur bilingue `{fr, en}` en texte, en gardant le français. */
function texte(valeur) {
  if (typeof valeur === 'string') return valeur
  if (valeur && typeof valeur === 'object' && !Array.isArray(valeur)) {
    return typeof valeur.fr === 'string' ? valeur.fr : Object.values(valeur).find((v) => typeof v === 'string') ?? ''
  }
  return ''
}

/**
 * Un téléphone est-il un GABARIT ?
 * On normalise en chiffres, puis on cherche une suite de 6 chiffres IDENTIQUES.
 * Un vrai numéro peut contenir `00` ou `000`, pas `000000`.
 * (La valeur publiée `+224 000 00 00 00` donne `224000000000` : 9 zéros.)
 */
export function estGabaritTelephone(numero) {
  const chiffres = String(numero ?? '').replace(/\D/g, '')
  if (chiffres.length < 6) return true // trop court pour être un numéro joignable
  return /(\d)\1{5,}/.test(chiffres)
}

/** Le domaine d'une adresse e-mail, ou null si l'adresse est malformée. */
export function domaineDe(email) {
  const t = String(email ?? '').trim()
  if (!t.includes('@')) return null
  const domaine = t.split('@').pop().toLowerCase()
  return domaine && domaine.includes('.') ? domaine : null
}

/**
 * Le domaine peut-il recevoir du courrier ?
 * Rend `true` (résout), `false` (n'existe pas — NXDOMAIN) ou `null`
 * (INVÉRIFIABLE : DNS injoignable). Distinguer les trois est le cœur du sujet :
 * confondre `null` et `false` ferait accuser un domaine valide.
 */
export async function domaineJoignable(domaine) {
  for (const tache of [() => mx(domaine), () => a(domaine)]) {
    try {
      const r = await tache()
      if (r && r.length > 0) return true
    } catch (err) {
      const code = err?.code ?? ''
      if (code === 'ENOTFOUND' || code === 'ENODATA') continue // ce type n'existe pas
      return null // réseau/DNS injoignable : on ne peut pas conclure
    }
  }
  return false
}

// ---------------------------------------------------------------- lecture base
async function reglages() {
  const r = await fetch(`${ENV.VITE_SUPABASE_URL}/rest/v1/site_content?select=value&key=eq.restaurant`, {
    headers: { apikey: ENV.NEW_SERVICE_ROLE_KEY, Authorization: `Bearer ${ENV.NEW_SERVICE_ROLE_KEY}` },
  })
  const t = await r.text()
  if (!r.ok) throw new Error(`GET site_content -> ${r.status} :: ${t.slice(0, 200)}`)
  const lignes = JSON.parse(t)
  return lignes?.[0]?.value ?? {}
}

const reglage = await reglages()
const telephone = texte(reglage.phone)
const address = texte(reglage.address)
const emailContact = texte(reglage.emailContact)
const emailReservation = texte(reglage.emailReservation)

console.log('='.repeat(72))
console.log('A. CE QUE LE SITE PUBLIE (source : `site_content`, clé `restaurant`)')
console.log('='.repeat(72))
console.log(`  téléphone    : ${telephone || '(vide)'}`)
console.log(`  adresse      : ${address || '(vide)'}`)
console.log(`  contact      : ${emailContact || '(vide)'}`)
console.log(`  réservation  : ${emailReservation || '(vide)'}`)

let echec = false

// ------------------------------------------------------------------ B. téléphone
console.log('\n' + '='.repeat(72))
console.log('B. LE TÉLÉPHONE — un client qui appelle atteint-il quelqu’un ?')
console.log('='.repeat(72))
if (!telephone.trim()) {
  console.log('  ECHEC : aucun téléphone publié.')
  console.log('  Le site n’affiche rien là où le restaurateur attend qu’on l’appelle.')
  echec = true
} else if (estGabaritTelephone(telephone)) {
  console.log(`  ECHEC : « ${telephone} » est un GABARIT, pas un numéro.`)
  console.log('  Chiffres normalisés : ' + telephone.replace(/\D/g, ''))
  console.log('  Un client qui appelle ce numéro n’atteint personne.')
  echec = true
} else {
  console.log(`  « ${telephone} » — aucune suite de chiffres répétés : plausible.`)
}

// ------------------------------------------------------------------ C. e-mails
console.log('\n' + '='.repeat(72))
console.log('C. LES E-MAILS — le domaine peut-il recevoir du courrier ?')
console.log('='.repeat(72))

const admis = []
for (const [quoi, adresse] of [['contact', emailContact], ['réservation', emailReservation]]) {
  if (!adresse.trim()) {
    console.log(`  ${quoi.padEnd(12)} : (vide) — le site n’affiche rien`)
    continue
  }
  const domaine = domaineDe(adresse)
  if (!domaine) {
    console.log(`  ${quoi.padEnd(12)} : « ${adresse} » — ECHEC, adresse malformée`)
    echec = true
    continue
  }
  const joignable = await domaineJoignable(domaine)
  if (joignable === true) {
    console.log(`  ${quoi.padEnd(12)} : « ${adresse} » — domaine « ${domaine} » résout`)
    admis.push(domaine)
  } else if (joignable === false) {
    console.log(`  ${quoi.padEnd(12)} : « ${adresse} » — ECHEC, le domaine « ${domaine} » N’EXISTE PAS`)
    console.log('                 Aucun MX, aucun enregistrement A : ce courrier ne peut pas arriver.')
    echec = true
  } else {
    console.log(`  ${quoi.padEnd(12)} : « ${adresse} » — INVÉRIFIABLE (DNS injoignable)`)
    console.log('                 On ne peut RIEN affirmer : « invérifiable » n’est pas « faux ».')
  }
}

// ------------------------------------------------------------------ D. adresse
console.log('\n' + '='.repeat(72))
console.log('D. L’ADRESSE POSTALE')
console.log('='.repeat(72))
if (!address.trim()) {
  console.log('  AVERTISSEMENT : aucune adresse publiée.')
} else if (!address.includes(',')) {
  console.log(`  AVERTISSEMENT : « ${address} » n’indique pas de quartier.`)
  console.log('  Un client qui ne connaît pas la ville ne peut pas situer le restaurant.')
} else {
  console.log(`  « ${address} » — contient un repère de quartier.`)
}

// ------------------------------------------------------------- E. sensibilité
console.log('\n' + '='.repeat(72))
console.log('E. SENSIBILITÉ — ce contrôle sait-il dire NON ?')
console.log('='.repeat(72))

const mesurer = (nom, condition) => {
  console.log(`  ${nom} : ${condition ? 'OUI' : 'NON'}`)
  if (!condition) echec = true
}

mesurer('le gabarit « +224 000 00 00 00 » est détecté', estGabaritTelephone('+224 000 00 00 00') === true)
mesurer('un vrai numéro passe', estGabaritTelephone('+224 621 45 78 90') === false)
mesurer('un numéro trop court est détecté', estGabaritTelephone('0044') === true)
mesurer('une adresse malformée est détectée', domaineDe('pas-une-adresse') === null)
mesurer('le domaine est bien extrait', domaineDe('contact@exemple.org') === 'exemple.org')

const domaineMort = await domaineJoignable('greatlife.gn')
const domaineVivant = await domaineJoignable('gmail.com')
mesurer('un domaine inexistant est détecté comme tel', domaineMort === false)
mesurer('un domaine réel est reconnu joignable', domaineVivant === true)

console.log('\n' + '='.repeat(72))
console.log(
  echec
    ? 'ECHEC — les coordonnées publiées ne permettent pas à un client de vous joindre.'
    : 'COORDONNÉES PUBLIÉES VÉRIFIÉES.',
)
if (echec) {
  console.log('')
  console.log('  CE QU’IL FAUT FAIRE : console -> « Réglages globaux » -> coordonnées.')
  console.log('  La saisie atteint bien le site public (vérifié le 2026-09-20).')
}
console.log('AUCUNE ÉCRITURE — cette sonde ne fait que lire (et interroger le DNS).')
console.log('='.repeat(72))
process.exitCode = echec ? 1 : 0

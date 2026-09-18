# Greatlife — Emails (Edge Function `send-contact-email`)

> Toute l'envoi d'emails passe par une **unique Edge Function** Supabase : `supabase/functions/send-contact-email/index.ts` (Deno). Le frontend l'invoque via `src/lib/supabase.ts`. Voir aussi [DEVELOPMENT.md → Sécurité](../DEVELOPMENT.md#sécurité).

## Vue d'ensemble

```
Frontend (src/lib/supabase.ts)        Edge Function (send-contact-email)
   invokeContactEmail(payload) ─────┐
   invokeReplyEmail(payload) ───────┼──▶ sb.functions.invoke('send-contact-email', { body })
   invokeOrderStatusEmail(payload)─┤                │
   invokeReservationStatusEmail…  ─┘                ▼
                                          switch (payload.action) {
                                            'contact'            → email au restaurant
                                            'reply'              → email au client (réponse admin)
                                            'reservation-status' → notif client (résa)
                                            'order-status'       → notif client (commande)
                                          }
                                                  │
                                                  ▼
                                          SMTP Gmail (smtp.gmail.com:465)
```

## L'Edge Function

Fichier : `supabase/functions/send-contact-email/index.ts`

- **Runtime** : Deno (Edge Function Supabase). Imports depuis `deno.land` et `esm.sh`.
- **CORS** : headers `Access-Control-Allow-*` ; gère `OPTIONS`.
- **Polyfill** : `Deno.writeAll` est recréé s'il manque (smtp@0.6.0 l'utilise, retiré du runtime Edge).
- **SMTP** : `smtp.gmail.com:465` (SSL) par défaut. Lecture de `SMTP_USER` / `SMTP_PASS` via `Deno.env.get(...)` — **aucun fallback codé en dur** (les secrets doivent être définis dans Supabase → Functions → `send-contact-email` → Secrets). `SMTP_HOST` et `SMTP_PORT` sont aussi surchargeables via des variables d'env (défaut `smtp.gmail.com:465`).
- **Email de destination** des messages de contact : lu depuis `site_content.emailContact` (configuré dans l'admin *Formulaires & emails*), avec repli optionnel sur la variable d'env `CONTACT_EMAIL`. Si ni l'un ni l'autre n'est défini, la fonction renvoie une erreur 500 claire (au lieu d'envoyer vers une adresse codée en dur).

### Les 4 actions (`payload.action`)

| Action | Déclenchée par | Destinataire | Contenu |
|---|---|---|---|
| `contact` (défaut) | Formulaire de contact public (`invokeContactEmail`) | Le restaurant (`SMTP_USER`) | Message du visiteur (nom, email, sujet, message) |
| `reply` | Admin → répondre à un message (`invokeReplyEmail`) | Le client (`to`) | Réponse de l'admin + message original |
| `reservation-status` | Admin change le statut d'une résa (`invokeReservationStatusEmail`) | Le client (`to`) | Statut (confirmé/annulé) + date/heure/couvres |
| `order-status` | Admin change le statut d'une commande (`invokeOrderStatusEmail`) | Le client (`to`) | Statut + ref + items + total + heure de retrait |

### Payload attendu (extrait de `index.ts`)

```ts
interface ContactPayload {
  action?: 'contact' | 'reply' | 'reservation-status' | 'order-status'
  // contact
  nom, email, sujet, message
  // reply
  to, subject, replyMessage, replyFromName?, originalMessage?
  // reservation-status
  status, resaDate?, resaTime?, resaGuests?
  // order-status
  ref?, items?, total?, pickupTime?
}
```

## Helpers frontend (`src/lib/supabase.ts`)

| Fonction | Action envoyée | Appelée depuis |
|---|---|---|
| `invokeContactEmail` | `contact` | `sections/Contact.tsx`, `sections/OrderCart.tsx`, `sections/Reservation.tsx` |
| `invokeReplyEmail` | `reply` | `admin/AdminPanel.tsx` (`MessagesManager`) |
| `invokeReservationStatusEmail` | `reservation-status` | `admin/AdminPanel.tsx` (`ReservationsManager`) |
| `invokeOrderStatusEmail` | `order-status` | `admin/AdminPanel.tsx` (`OrdersManager`) |

Chaque helper :
- renvoie `{ ok: boolean; error?: string }`,
- vérifie `getSupabase()` et l'URL de la fonction (sinon `{ ok: false, error: 'not-configured' }`),
- gère les erreurs Resend/SMTP (tableau `errors` joint par `; `).

En **mode démo** (Supabase non configuré), tous les helpers renvoient `ok: false` sans rien envoyer — les sections gèrent ce cas gracieusement (affichent quand même un succès UI en mode démo local).

## Configuration des secrets

> ⚠️ **Action de sécurité requise** — voir [DEVELOPMENT.md → Sécurité](../DEVELOPMENT.md#sécurité).

L'Edge Function lit ses **secrets depuis l'environnement** (`Deno.env.get`) — il n'y a **plus de valeurs codées en dur** dans le code source :
```ts
const SMTP_USER = Deno.env.get("SMTP_USER");
const SMTP_PASS = Deno.env.get("SMTP_PASS");
const SMTP_HOST = Deno.env.get("SMTP_HOST") || "smtp.gmail.com";
const SMTP_PORT = Number(Deno.env.get("SMTP_PORT") || 465);
```
L'email de destination des messages de contact vient de `site_content.emailContact` (admin) avec repli sur `CONTACT_EMAIL`, sinon erreur 500 explicite.

### Configuration requise

1. Dans Supabase → *Functions* → `send-contact-email` → *Secrets*.
2. Ajoutez **au minimum** :
   - `SMTP_USER` — compte Gmail émetteur.
   - `SMTP_PASS` — mot de passe d'application Gmail (pas le mot de passe principal).
3. *(Optionnel)* `SMTP_HOST` / `SMTP_PORT` si vous n'utilisez pas Gmail (`smtp.gmail.com:465` par défaut).
4. *(Optionnel)* `CONTACT_EMAIL` — email de destination des messages de contact si `site_content.emailContact` n'est pas configuré. Préférez configurer l'email de contact dans l'admin (*Formulaires & emails*) plutôt que ce secret.
5. Sans `SMTP_USER`/`SMTP_PASS`, les 4 actions renvoient `{ ok: false, errors: ["no-credentials"] }` (garde `if (SMTP_USER && SMTP_PASS)` déjà présente) — aucun envoi n'a lieu.
6. Redéployez l'Edge Function après avoir défini les secrets.

> Historique : ces identifiants étaient précédemment codés en dur dans `index.ts` (commit `ed5237c`→`docs`). Le retrait a été fait dans une étape dédiée de sécurité (voir PR correspondante et `DEVELOPMENT.md` → Sécurité).

## Déployer / modifier l'Edge Function

```bash
# Via Supabase CLI (si configuré)
supabase functions deploy send-contact-email --project-ref atsujzoozqnjelngqkab

# Ou via le dashboard Supabase → Functions → éditer en ligne
```

### Ajouter une nouvelle action d'email

1. Dans `index.ts`, ajoutez une branche au `switch (action)` avec la construction du message SMTP.
2. Ajoutez l'interface des champs du payload.
3. Dans `src/lib/supabase.ts`, ajoutez un helper `invokeMonEmail(payload)` qui appelle `sb.functions.invoke('send-contact-email', { body: { action: 'mon-action', ...payload } })`.
4. Appelez ce helper depuis le module admin / la section concernée.

## Tests

- **Mode démo** : les helpers renvoient `ok: false` (pas d'envoi). Les formulaires affichent un succès simulé côté UI.
- **Mode Supabase** : un envoi réel part via SMTP. Vérifiez dans Supabase → *Functions* → *Logs* (erreurs SMTP, payloads rejetés).

## Liens

- [database.md](./database.md) — les tables que les notifications concernent (`messages`, `reservations`, `orders`)
- [admin-panel.md](./admin-panel.md) — les modules qui déclenchent les envois
- [DEVELOPMENT.md](../DEVELOPMENT.md) — checklist sécurité & secrets

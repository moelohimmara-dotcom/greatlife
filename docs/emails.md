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
- **SMTP** : `smtp.gmail.com:465` (SSL). Lecture de `SMTP_USER` / `SMTP_PASS` via `Deno.env.get(...)`.

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

L'Edge Function lit :
```ts
const SMTP_USER = Deno.env.get("SMTP_USER") || "<valeur en dur>";
const SMTP_PASS = Deno.env.get("SMTP_PASS") || "<valeur en dur>";
```

Les valeurs en dur sont un **risque de sécurité** (mot de passe d'application Gmail committé). Procédure :

1. Dans Supabase → *Functions* → `send-contact-email` → *Secrets*.
2. Ajoutez `SMTP_USER` (compte Gmail) et `SMTP_PASS` (mot de passe d'application, *pas* le mot de passe principal).
3. **Supprimez** les fallbacks `|| "<valeur en dur>"` du fichier `index.ts` (laissez `Deno.env.get("SMTP_USER")` seul, avec une erreur claire s'il manque).
4. Redéployez l'Edge Function.

## Déployer / modifier l'Edge Function

```bash
# Via Supabase CLI (si configuré)
supabase functions deploy send-contact-email --project-ref gpvfryvmghjenwfqhnkd

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

# 16 — Gouvernance Fable Advisor

> **Objet** : documenter la manière dont l'exigence « Fable Advisor » du TDR (§36, §37, §38) est satisfaite dans l'environnement d'exécution actuel, et l'écart assumé qui en découle.
>
> **Statut** : décision du propriétaire du projet, 2026-09-18.
> **Portée** : tout le projet Greatlife, jusqu'à nouvel arbitrage.

---

## 1. L'exigence du TDR

Le TDR impose `fable-advisor` comme mécanisme de seconde opinion :

- **§36** — Fable doit être consulté avant une décision d'architecture difficilement réversible, avant une migration importante de base de données, avant un changement de contrat API, avant un gros refactor, lorsqu'un problème échoue deux fois, et avant de déclarer un lot important terminé. Fable reçoit la décision, les contraintes, les options, les fichiers pertinents et les preuves. Il doit **challenger**, non confirmer.
- **§37** — Workflow par lot : `PLAN → FABLE REVIEW → IMPLEMENTATION → TEST → FABLE FINAL REVIEW → DONE`.
- **§38** — Verdicts attendus : `proceed`, `proceed-with-changes`, `reconsider`.

Les règles de travail (`AGENTS.md`, §11 et §12) reprennent la même obligation et précisent que Fable est **advisory et read-only** : il ne code jamais.

---

## 2. L'écart constaté

`fable-advisor` **n'est pas un skill mais un agent Claude Code**, défini dans :

```text
C:/Users/MARA/.claude/agents/fable-advisor.md
```

Sa définition déclare :

```yaml
name: fable-advisor
model: fable
tools: Read, Grep, Glob
```

Il s'exécute donc avec **le modèle `fable`** de Claude et trois outils en lecture seule.

Or cet environnement d'exécution (MiniMax Code) **n'expose pas le modèle `fable`**. Le catalogue local disponible contient `minimax-m3`, `minimax-m2.7`, `minimax-m2.5` ainsi que des modèles NVIDIA. Aucun modèle Claude n'y est accessible.

**Conséquence** : l'obligation du §36 **n'est pas exécutable telle quelle** par l'agent qui développe le projet. C'est un écart de gouvernance, pas une préférence.

---

## 3. La décision retenue

> **Décision du propriétaire, 2026-09-18** : adopter l'agent **`verifier`** de l'environnement MiniMax Code comme **substitut officiel et documenté** de Fable Advisor, pour toute la durée du projet, jusqu'à nouvel arbitrage.

Cet écart est assumé et tracé dans le présent document, conformément à la règle « signaler plutôt que simuler ».

### Pourquoi `verifier` est le substitut le plus proche

| Critère du TDR | Exigence Fable | Agent `verifier` | Équivalence |
|---|---|---|---|
| Rôle | Conseiller, jamais exécutant | Rapporte des constats, **ne corrige rien** | ✅ identique |
| Accès | `Read`, `Grep`, `Glob` (lecture seule) | Lecture seule, aucune écriture de fichier projet | ✅ identique |
| Posture | Doit **challenger** la décision | Mandaté pour **contester** les affirmations, chercher l'erreur | ✅ identique |
| Entrées | Décision, contraintes, options, fichiers, preuves | Même brief exigé par la convention de délégation du projet | ✅ identique |
| Sortie | Verdict + raison + risque décisif | Verdict + erreurs classées par gravité + preuves `fichier:ligne` | ✅ compatible |
| Contexte | Frais, sans hypothèses conversationnelles | Session enfant isolée, ne voit pas la conversation parente | ✅ identique |

### Divergences assumées

| Point | Fable | Substitut `verifier` |
|---|---|---|
| Modèle sous-jacent | `fable` (le plus capable de Claude) | Modèle disponible dans le runtime MiniMax |
| Verdicts normalisés du §38 | `proceed` / `proceed-with-changes` / `reconsider` | Restitués sous forme de verdict textuel — **à normaliser** dans le vocabulaire du §38 à chaque revue |
| Cohérence inter-lots | Mémoire de session Claude Code | Aucune : chaque revue est isolée, le contexte doit être fourni intégralement à chaque fois |
| Autorité | Advisory | Advisory — **le même niveau**, aucune décision automatique |

---

## 4. Vocabulaire des verdicts

Chaque revue de substitut doit être restituée dans le vocabulaire du §38 :

| Verdict §38 | Signification | Suite |
|---|---|---|
| `proceed` | Le plan ou le lot est validé | Implémentation / clôture du lot |
| `proceed-with-changes` | Validé **sous conditions** | Appliquer les corrections nommées **avant** de continuer, puis re-vérifier |
| `reconsider` | Le plan ou le lot est à revoir | Ne pas implémenter ; reprendre le plan |

Le verdict est consigné dans le rapport de lot (champ `Fable verdict` du §43).

---

## 5. Points d'invocation obligatoires

Le substitut est consulté **exactement** aux points prévus par le §36, ni plus, ni moins — le TDR précise au §37 que le codeur ne doit pas « gaspiller Fable sur chaque petit changement » :

1. avant toute décision d'architecture difficilement réversible ;
2. avant toute migration importante de base de données ;
3. avant tout changement de contrat API ;
4. avant tout gros refactor ;
5. lorsqu'un même problème a résisté à deux tentatives de correction ;
6. **avant de déclarer un lot important terminé** (revue finale, §38).

Les changements simples suivent le flux court : `PLAN → IMPLEMENTATION → TEST`.

---

## 6. Ce que le substitut ne remplace pas

- Il **ne code pas** et **ne corrige aucun fichier** : les corrections restent à la charge de l'agent exécutant.
- Il **ne décide pas** : ses constats sont des avis à arbitrer. Il peut se tromper — lors de la revue de l'audit, il a affirmé à tort que `restaurantName` était absent du code, alors que la chaîne existe (`SiteContext.tsx:21,142`). Un constat de revue doit donc être **vérifié avant d'être appliqué**.
- Il **ne remplace pas l'arbitrage du propriétaire** sur les décisions produit.

---

## 7. Preuve d'utilité

La première revue effectuée selon ce dispositif — sur `docs/01_EXISTING_PROJECT_AUDIT.md` — a produit :

- **10 corrections factuelles** appliquées (volumétrie, nombre de policies, compte des usages de `canDo`, occurrences de `catch` silencieux, comptage des composants, cohérence interne) ;
- **1 correction de fond majeure** : la mise en évidence que l'atténuation rassurante du §7 de l'audit (« les écritures restent bloquées par la RLS ») était **nulle dans le scénario critique** ;
- **5 angles morts** identifiés et intégrés (conversion des données, édition concurrente, RGPD, observabilité, sauvegarde).

Le dispositif n'est donc pas une formalité : il a réellement corrigé le livrable.

---

## 8. Retour à Fable proprement dit

Si le propriétaire souhaite l'avis de Fable au sens strict du TDR, la procédure est :

1. l'agent exécutant prépare un brief conforme au §36 — décision, contraintes, options, chemins de fichiers, preuves ;
2. le propriétaire le soumet à Claude Code, où l'agent `fable-advisor` est disponible ;
3. le propriétaire rapporte le verdict, qui est consigné dans le rapport de lot.

Ce basculement reste ouvert à tout moment et ne nécessite aucune modification du projet. Il peut être appliqué sélectivement (par exemple uniquement aux décisions de migration de données) sans abandonner le substitut pour le reste.

---

## 9. Références

- `docs/00_TDR_GREATLIFE_CMS.md` §36, §37, §38 — l'exigence et le workflow.
- `AGENTS.md` §11, §12 — l'obligation et la revue finale.
- `C:/Users/MARA/.claude/agents/fable-advisor.md` — la définition de l'agent Fable.
- `docs/01_EXISTING_PROJECT_AUDIT.md` §25 — la première revue effectuée selon ce dispositif.

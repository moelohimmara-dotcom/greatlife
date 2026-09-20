/**
 * Modèle — plan de sauvegarde de la colonne Structure (PUR)
 * =========================================================
 * POURQUOI CE MODULE EXISTE
 * `useEditor.save()` mêlait la DÉCISION (que créer, que supprimer, que mettre à
 * jour) et l'ÉCRITURE (appels réseau), dans la même boucle. C'est ce mélange qui
 * la rendait intestable : vérifier la décision aurait exigé une base de données.
 *
 * La décision est donc extraite ici, à l'état pur : ce module ne dépend ni de
 * Supabase, ni de React, ni de Vite, ni de `import.meta.env`. Elle se vérifie
 * sans base et sans framework — même frontière que `@/cms/renderer` et
 * `./publishing/snapshot` (CM-7 / AR-10).
 *
 * CE QUE LA DÉCISION DOIT GARANTIR
 * (vérifié par `npm run test:save-plan`, exécuté, pas seulement écrit)
 *   - une section dont l'identifiant n'a PAS été attribué par la base (`temp-…`)
 *     doit être CRÉÉE ;
 *   - une section présente en base et toujours dans la liste doit être CONSERVÉE ;
 *   - une section retirée de la liste doit être SUPPRIMÉE — et seulement si elle
 *     existait réellement en base ;
 *   - l'ORDRE des étapes suit l'ordre d'affichage, parce que `reorderSections`
 *     écrit les positions dans cet ordre.
 */

import type { PageSection } from './section'

/** Ce qu'il y a à faire d'une section présente dans la liste locale. */
export type EtapeSauvegarde =
  | { action: 'creer'; section: PageSection }
  | { action: 'conserver'; section: PageSection }

export interface PlanSauvegarde {
  /** Identifiants à supprimer en base. */
  aSupprimer: string[]
  /** Ce qu'il faut faire de chaque section, DANS L'ORDRE d'affichage. */
  etapes: EtapeSauvegarde[]
}

/**
 * `true` si l'identifiant a été attribué par la BASE (un UUID).
 *
 * `addSection` fabrique un identifiant provisoire (`temp-<horodatage>`) pour la
 * section que le restaurateur vient d'ajouter : celle-là n'a pas encore de ligne.
 * La distinction est ce qui permet de choisir entre CRÉER et METTRE À JOUR — et
 * donc de ne jamais envoyer un `temp-…` à la base, qui le refuse :
 *     select 'temp-123'::uuid  ->  ERROR 22P02: invalid input syntax for type uuid
 */
export function isPersistedId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

/**
 * Empreinte des données qu'une sauvegarde ÉCRIT, indépendante des identifiants.
 *
 * POURQUOI ELLE EXISTE (revue du 2026-09-20, I-5)
 * Une sauvegarde dure 2N+2 allers-retours, et rien ne désactive les champs
 * pendant ce temps : le restaurateur continue de taper. Or `save()` ne
 * consigne nulle part ce qui est arrivé entre-temps — le texte saisi pendant
 * l'enregistrement n'était donc PAS enregistré, et rien ne le disait. C'est la
 * seule perte SILENCIEUSE du chemin d'édition.
 *
 * En comparant cette empreinte au début et à la fin, on sait si des
 * modifications sont arrivées entre-temps — et on peut le DIRE.
 *
 * ⚠️ CE QU'ELLE NE CORRIGE PAS, PARCE QUE C'ÉTAIT DÉJÀ CORRIGÉ (revue du
 * 2026-09-20, B1 — affirmation fausse initialement écrite ici)
 * La version `41ff35b` de `save()` terminait par
 *     setState({ ...s, sections: persistees, ... })
 * — une RÉINJECTION de l'instantané du début, qui écrasait la saisie en cours.
 * Ce défaut a été fermé au commit `668488d`, AVANT ce module : `useEditor.ts`
 * fait depuis `s.sections.map(...)`, c'est-à-dire une FUSION qui ne réécrit que
 * l'identifiant. Décrire ici la réinjection au présent était donc faux.
 * Ce qui restait ouvert, et que cette empreinte traite, est plus étroit : la
 * saisie en vol est CONSERVÉE mais pas ENREGISTRÉE, et personne ne le disait.
 *
 * Ce qui entre dans l'empreinte : le contenu qui s'écrit. Ce qui en est exclu :
 *  - les identifiants (ils changent légitimement : `temp-…` → UUID) ;
 *  - les positions (elles sont recalculées depuis l'ORDRE, et l'ordre est déjà
 *    capturé par l'ordre du tableau — les inclure produirait de faux positifs).
 *
 * ⚠️ LIMITE CONNUE, MESURÉE PAR UN TEST (pas supposée)
 * Deux sections que RIEN ne distingue — même type, même contenu, même ancre,
 * même visibilité — sont interchangeables sans changer l'empreinte. Les échanger
 * n'avertirait donc pas. C'est assumé : un tel échange est aussi sans effet
 * visible, les deux sections étant identiques.
 */
export function empreinteSauvegarde(sections: readonly PageSection[]): string {
  return JSON.stringify(
    sections.map((s) => [s.type, s.variant, s.visible, s.anchor, s.content, s.settings]),
  )
}

/**
 * Décide ce qu'une sauvegarde doit écrire. Fonction pure : aucun accès réseau.
 *
 * `removedIds` porte les sections que le restaurateur a retirées de la liste
 * depuis le dernier chargement. Elles ne sont supprimées qu'ICI, au moment de
 * l'enregistrement : jusque-là, un simple rechargement annule le geste.
 */
export function planifierSauvegarde(
  sections: readonly PageSection[],
  removedIds: readonly string[],
): PlanSauvegarde {
  const encorePresentes = new Set(
    sections.filter((s) => isPersistedId(s.id)).map((s) => s.id),
  )

  return {
    /*
      Deux raisons de NE PAS supprimer :
        - un identifiant `temp-…` n'a jamais existé en base — l'y envoyer
          ferait échouer toute la sauvegarde ;
        - un identifiant revenu dans la liste ne doit pas être supprimé.
      Le dédoublonnage protège d'un retrait suivi d'un ajout.
    */
    aSupprimer: [...new Set(removedIds)].filter(
      (id) => isPersistedId(id) && !encorePresentes.has(id),
    ),
    etapes: sections.map((section) =>
      isPersistedId(section.id)
        ? { action: 'conserver', section }
        : { action: 'creer', section },
    ),
  }
}

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

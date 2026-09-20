/**
 * Choix d'une disposition déclarée (TDR §13).
 *
 * Une valeur absente, vide ou inconnue retombe sur le défaut — toujours la
 * première disposition du registre, qui est aussi le rendu historique. C'est
 * ce qui autorise `verify:lot1` à rester au vert quand on branche un nouveau
 * bloc : le visiteur ne voit rien changer tant que le restaurateur n'a pas
 * choisi autre chose et publié.
 */
export function normaliserDisposition<T extends string>(
  valeur: string | null | undefined,
  autorisees: readonly T[],
  defaut: T,
): T {
  return typeof valeur === 'string' && (autorisees as readonly string[]).includes(valeur)
    ? (valeur as T)
    : defaut
}

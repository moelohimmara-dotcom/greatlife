/**
 * Gabarits visuels des cinq mises en page publiques.
 * Le choix est stocké (`pages.layout` / instantané). Ici on n'invente pas
 * cinq sites : on habille les mêmes blocs pour qu'ils tiennent avec le
 * menu, le pied de page, et un écran étroit.
 *
 * « Colonne unique » n'ajoute aucune règle — c'est le site historique.
 */
export const CSS_GABARITS_PAGE = `
[data-cms-layout="hero_alternating"] [data-cms-stripe="alt"] {
  background: var(--c-surface-alt, #FAF6F0);
}
[data-cms-layout="hero_alternating"] [data-cms-stripe="plain"] {
  background: transparent;
}

[data-cms-layout="magazine"] .page-layout-hero section {
  min-height: 100vh !important;
}
[data-cms-layout="magazine"] .page-layout-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 24px 72px;
  align-items: stretch;
  box-sizing: border-box;
}
[data-cms-layout="magazine"] .page-layout-cell {
  min-width: 0;
  overflow: hidden;
  background: var(--c-surface, #fff);
  border: 1px solid var(--c-shadow, rgba(45,90,39,0.08));
  border-radius: 16px;
}
[data-cms-layout="magazine"] .page-layout-cell [style*="grid-template-columns"] {
  grid-template-columns: minmax(0, 1fr) !important;
  gap: 16px !important;
}
[data-cms-layout="magazine"] .page-layout-cell .hero-grid {
  grid-template-columns: minmax(0, 1fr) !important;
}

[data-cms-layout="hero_parallax"] .page-layout-parallax {
  position: sticky;
  top: 0;
  z-index: 0;
}
[data-cms-layout="hero_parallax"] .page-layout-parallax section {
  min-height: 100vh !important;
}
[data-cms-layout="hero_parallax"] .page-layout-rest {
  position: relative;
  z-index: 1;
  background: var(--c-cream, #F5EFE6);
  border-radius: 28px 28px 0 0;
  box-shadow: 0 -24px 48px var(--c-shadow-deep, rgba(45,90,39,0.16));
  overflow: hidden;
}

[data-cms-layout="split"] {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: start;
  min-height: 100vh;
}
[data-cms-layout="split"] .page-layout-split-hero {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: hidden;
}
[data-cms-layout="split"] .page-layout-split-hero section {
  min-height: 100vh !important;
  height: 100%;
}
[data-cms-layout="split"] .page-layout-split-rest {
  min-height: 100vh;
  background: var(--c-cream, #F5EFE6);
  border-left: 1px solid var(--c-shadow, rgba(45,90,39,0.08));
}
[data-cms-layout="split"] .page-layout-split-rest [style*="grid-template-columns: 1fr 1fr"] {
  grid-template-columns: minmax(0, 1fr) !important;
}

@media (max-width: 900px) {
  [data-cms-layout="magazine"] .page-layout-grid {
    grid-template-columns: minmax(0, 1fr);
    padding: 24px 16px 48px;
    gap: 16px;
  }
  [data-cms-layout="split"] {
    display: block;
  }
  [data-cms-layout="split"] .page-layout-split-hero {
    position: relative;
    height: auto;
  }
  [data-cms-layout="split"] .page-layout-split-hero section {
    min-height: 70vh !important;
  }
  [data-cms-layout="split"] .page-layout-split-rest {
    border-left: none;
  }
  [data-cms-layout="hero_parallax"] .page-layout-parallax {
    position: relative;
  }
}
`

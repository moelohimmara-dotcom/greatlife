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
[data-cms-layout="hero_alternating"] [data-cms-stripe="alt"] section {
  background: transparent !important;
}

[data-cms-layout="magazine"] .page-layout-hero .hero-plein {
  min-height: 100vh !important;
}
[data-cms-layout="magazine"] .page-layout-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 24px 24px;
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
[data-cms-layout="magazine"] .page-layout-cell .section-pad {
  padding: 28px 22px !important;
  max-width: none !important;
}
[data-cms-layout="magazine"] .page-layout-cell .story-grid,
[data-cms-layout="magazine"] .page-layout-cell .loca-grid,
[data-cms-layout="magazine"] .page-layout-cell .hero-grid {
  grid-template-columns: minmax(0, 1fr) !important;
  gap: 16px !important;
  max-width: none !important;
}
[data-cms-layout="magazine"] .page-layout-cell .engagements-grid,
[data-cms-layout="magazine"] .page-layout-cell .menu-grid {
  grid-template-columns: minmax(0, 1fr) !important;
}
[data-cms-layout="magazine"] .page-layout-cell [style*="grid-template-columns"] {
  grid-template-columns: minmax(0, 1fr) !important;
  gap: 16px !important;
}
[data-cms-layout="magazine"] .page-layout-band {
  max-width: 1200px;
  margin: 0 auto;
  padding: 8px 24px 40px;
  box-sizing: border-box;
}

[data-cms-layout="hero_parallax"] .page-layout-parallax {
  position: sticky;
  top: 0;
  z-index: 0;
}
[data-cms-layout="hero_parallax"] .page-layout-parallax .hero-plein {
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
[data-cms-layout="hero_parallax"] .page-layout-rest .section-pad {
  padding-top: 56px !important;
  padding-bottom: 56px !important;
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
[data-cms-layout="split"] .page-layout-split-hero .hero-plein {
  min-height: 100vh !important;
  height: 100%;
}
[data-cms-layout="split"] .page-layout-split-hero .hero-plein-inner {
  max-width: 100% !important;
  padding: 88px 28px 48px !important;
}
[data-cms-layout="split"] .page-layout-split-hero .hero-plein-inner h1 {
  font-size: clamp(28px, 3.4vw, 48px) !important;
}
[data-cms-layout="split"] .page-layout-split-rest {
  min-height: 100vh;
  background: var(--c-cream, #F5EFE6);
  border-left: 1px solid var(--c-shadow, rgba(45,90,39,0.08));
  min-width: 0;
}
[data-cms-layout="split"] .page-layout-split-rest .section-pad {
  padding: 48px 28px !important;
  max-width: none !important;
}
[data-cms-layout="split"] .page-layout-split-rest .story-grid,
[data-cms-layout="split"] .page-layout-split-rest .loca-grid,
[data-cms-layout="split"] .page-layout-split-rest .hero-grid {
  grid-template-columns: minmax(0, 1fr) !important;
  gap: 24px !important;
  max-width: none !important;
}
[data-cms-layout="split"] .page-layout-split-rest .engagements-grid,
[data-cms-layout="split"] .page-layout-split-rest .menu-grid {
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)) !important;
}
[data-cms-layout="split"] .page-layout-split-rest [style*="grid-template-columns: 1fr 1fr"] {
  grid-template-columns: minmax(0, 1fr) !important;
}
[data-cms-layout="split"] .page-layout-split-rest .footer-grid {
  grid-template-columns: minmax(0, 1fr) !important;
  gap: 24px !important;
}

@media (max-width: 900px) {
  [data-cms-layout="magazine"] .page-layout-grid {
    grid-template-columns: minmax(0, 1fr);
    padding: 24px 16px 16px;
    gap: 16px;
  }
  [data-cms-layout="magazine"] .page-layout-band {
    padding: 8px 16px 32px;
  }
  [data-cms-layout="split"] {
    display: block;
  }
  [data-cms-layout="split"] .page-layout-split-hero {
    position: relative;
    height: auto;
  }
  [data-cms-layout="split"] .page-layout-split-hero .hero-plein {
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

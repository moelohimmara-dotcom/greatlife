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
[data-cms-layout="magazine"] .page-layout-hero .hero-plein-inner {
  padding-top: 108px !important;
}
[data-cms-layout="magazine"] .page-layout-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  column-gap: 48px;
  row-gap: 48px;
  max-width: 1120px;
  margin: 0 auto;
  padding: 48px 32px 16px;
  align-items: start;
  box-sizing: border-box;
}
[data-cms-layout="magazine"] .page-layout-cell {
  min-width: 0;
  overflow: visible;
  background: transparent;
  border: none;
  border-radius: 0;
}
[data-cms-layout="magazine"] .page-layout-cell--spread {
  grid-column: 1 / -1;
}
[data-cms-layout="magazine"] .page-layout-cell--spread .section-pad {
  padding: 0 !important;
  max-width: none !important;
  background: transparent !important;
}
[data-cms-layout="magazine"] .page-layout-cell--spread .story-grid {
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr) !important;
  gap: 40px !important;
  max-width: none !important;
}
[data-cms-layout="magazine"] .page-layout-cell--aside {
  padding-top: 18px;
  border-top: 3px solid var(--c-primary, #2D5A27);
}
[data-cms-layout="magazine"] .page-layout-cell--aside .section-pad {
  padding: 20px 0 0 !important;
  max-width: none !important;
  background: transparent !important;
}
[data-cms-layout="magazine"] .page-layout-cell--aside .story-grid,
[data-cms-layout="magazine"] .page-layout-cell--aside .loca-grid,
[data-cms-layout="magazine"] .page-layout-cell--aside .hero-grid {
  grid-template-columns: minmax(0, 1fr) !important;
  gap: 16px !important;
  max-width: none !important;
}
[data-cms-layout="magazine"] .page-layout-cell--aside .engagements-grid,
[data-cms-layout="magazine"] .page-layout-cell--aside .menu-grid {
  grid-template-columns: minmax(0, 1fr) !important;
}
[data-cms-layout="magazine"] .page-layout-cell--aside [style*="grid-template-columns"] {
  grid-template-columns: minmax(0, 1fr) !important;
  gap: 16px !important;
}
[data-cms-layout="magazine"] .page-layout-band {
  max-width: 1120px;
  margin: 0 auto;
  padding: 8px 32px 48px;
  box-sizing: border-box;
}
[data-cms-layout="magazine"] .page-layout-band [data-cms-section="menu"] .section-pad,
[data-cms-layout="magazine"] .page-layout-band [data-cms-section="blog"] .section-pad {
  padding: 40px 0 24px !important;
  max-width: none !important;
}
[data-cms-layout="magazine"] .page-layout-band [data-cms-section="menu"] .menu-grid {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
  gap: 16px !important;
}
[data-cms-layout="magazine"] .page-layout-band [data-cms-section="blog"] .blog-grid {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
  gap: 24px !important;
}
[data-cms-layout="magazine"] .page-layout-band [data-cms-section="blog"] .blog-grid > :first-child {
  grid-column: 1 / -1 !important;
}
[data-cms-layout="magazine"] .page-layout-band [data-cms-section="blog"] .blog-grid > :first-child [style*="height:160px"],
[data-cms-layout="magazine"] .page-layout-band [data-cms-section="blog"] .blog-grid > :first-child [style*="height: 160px"] {
  height: 280px !important;
}

[data-cms-layout="hero_alternating"] [data-cms-section="menu"] .section-pad,
[data-cms-layout="hero_alternating"] [data-cms-section="blog"] .section-pad {
  padding: 64px 24px !important;
}
[data-cms-layout="hero_alternating"] [data-cms-section="menu"] .menu-grid {
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)) !important;
  gap: 20px !important;
}
[data-cms-layout="hero_alternating"] [data-cms-section="blog"] .blog-grid {
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)) !important;
  gap: 20px !important;
}

[data-cms-layout="hero_parallax"] .page-layout-rest [data-cms-section="menu"] .section-pad,
[data-cms-layout="hero_parallax"] .page-layout-rest [data-cms-section="blog"] .section-pad {
  max-width: 1120px !important;
  padding: 56px 32px !important;
}
[data-cms-layout="hero_parallax"] .page-layout-rest [data-cms-section="menu"] .menu-grid {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
  gap: 20px !important;
}
[data-cms-layout="hero_parallax"] .page-layout-rest [data-cms-section="blog"] .blog-grid {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
  gap: 24px !important;
}
[data-cms-layout="hero_parallax"] .page-layout-rest [data-cms-section="blog"] .blog-grid > :first-child {
  grid-column: 1 / -1 !important;
}
[data-cms-layout="hero_parallax"] .page-layout-rest [data-cms-section="blog"] .blog-grid > :first-child [style*="height:160px"],
[data-cms-layout="hero_parallax"] .page-layout-rest [data-cms-section="blog"] .blog-grid > :first-child [style*="height: 160px"] {
  height: 240px !important;
}

[data-cms-layout="split"] .page-layout-split-rest [data-cms-section="menu"] .menu-grid,
[data-cms-layout="split"] .page-layout-split-rest [data-cms-section="blog"] .blog-grid {
  grid-template-columns: minmax(0, 1fr) !important;
  gap: 16px !important;
}
[data-cms-layout="split"] .page-layout-split-rest [data-cms-section="blog"] .blog-grid [style*="height:160px"],
[data-cms-layout="split"] .page-layout-split-rest [data-cms-section="blog"] .blog-grid [style*="height: 160px"] {
  height: 140px !important;
}
[data-cms-layout="split"] [data-cms-section="blog"] button,
[data-cms-layout="magazine"] [data-cms-section="blog"] button,
[data-cms-layout="hero_parallax"] [data-cms-section="blog"] button,
[data-cms-layout="hero_alternating"] [data-cms-section="blog"] button,
[data-cms-layout="split"] [data-cms-section="menu"] button,
[data-cms-layout="magazine"] [data-cms-section="menu"] button,
[data-cms-layout="hero_parallax"] [data-cms-section="menu"] button,
[data-cms-layout="hero_alternating"] [data-cms-section="menu"] button {
  min-height: 44px;
  min-width: 44px;
}

[data-cms-layout="hero_parallax"] .page-layout-parallax {
  position: sticky;
  top: 0;
  z-index: 0;
}
[data-cms-layout="hero_parallax"] .page-layout-parallax .hero-plein {
  min-height: 100vh !important;
}
[data-cms-layout="hero_parallax"] .page-layout-parallax .hero-plein-inner {
  padding-top: 108px !important;
}
[data-cms-layout="hero_parallax"] .page-layout-rest {
  position: relative;
  z-index: 1;
  background: var(--c-cream, #F5EFE6);
  border-radius: 0;
  border-top: 3px solid var(--c-gold, #C4A35A);
  box-shadow: 0 -16px 40px var(--c-shadow-deep, rgba(45,90,39,0.18));
  overflow: visible;
}
[data-cms-layout="hero_parallax"] .page-layout-rest .section-pad {
  padding-top: 48px !important;
  padding-bottom: 48px !important;
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
[data-cms-layout="split"] .page-layout-split-rest .engagements-grid {
  grid-template-columns: minmax(0, 1fr) !important;
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
    padding: 32px 20px 8px;
    column-gap: 0;
    row-gap: 36px;
  }
  [data-cms-layout="magazine"] .page-layout-cell--spread .story-grid {
    grid-template-columns: minmax(0, 1fr) !important;
    gap: 24px !important;
  }
  [data-cms-layout="magazine"] .page-layout-band [data-cms-section="menu"] .menu-grid,
  [data-cms-layout="magazine"] .page-layout-band [data-cms-section="blog"] .blog-grid,
  [data-cms-layout="hero_parallax"] .page-layout-rest [data-cms-section="menu"] .menu-grid,
  [data-cms-layout="hero_parallax"] .page-layout-rest [data-cms-section="blog"] .blog-grid,
  [data-cms-layout="hero_alternating"] [data-cms-section="menu"] .menu-grid,
  [data-cms-layout="hero_alternating"] [data-cms-section="blog"] .blog-grid {
    grid-template-columns: minmax(0, 1fr) !important;
  }
  [data-cms-layout="magazine"] .page-layout-band {
    padding: 8px 20px 32px;
  }
  [data-cms-layout="magazine"] .page-layout-band [data-cms-section="blog"] .blog-grid > :first-child,
  [data-cms-layout="hero_parallax"] .page-layout-rest [data-cms-section="blog"] .blog-grid > :first-child {
    grid-column: auto;
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

[data-cms-layout] [data-cms-section][data-cms-spacing="compact"] .section-pad {
  padding-top: 40px !important;
  padding-bottom: 40px !important;
}
[data-cms-layout] [data-cms-section][data-cms-spacing="roomy"] .section-pad {
  padding-top: 120px !important;
  padding-bottom: 120px !important;
}
[data-cms-layout] [data-cms-section][data-cms-spacing="compact"] .section-pad-top {
  padding-top: 20px !important;
  padding-bottom: 56px !important;
}
[data-cms-layout] [data-cms-section][data-cms-spacing="roomy"] .section-pad-top {
  padding-top: 56px !important;
  padding-bottom: 120px !important;
}
`

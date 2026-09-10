# Greatlife — Architecture modulaire

## Structure des dossiers

\`\`\`
src/
├── config/              Module 2 — Thèmes, polices, badges
├── lib/icons/           Module 3 — Bibliothèque d'icônes SVG
├── data/                Module 4 — Menu, rôles, utilisateurs
├── contexts/            Module 5 — Auth, Site (thème/contenu)
├── hooks/               Module 6 — useIsMobile, useScrollSpy
├── components/ui/       Module 6 — Primitives (Reveal, OrganicCard, etc.)
├── components/nav/      Module 7 — Navigation publique
├── sections/            Module 8 — Hero, Carte, Story, Team, etc.
├── auth/                Module 9 — Login, ProtectedRoute
├── admin/               Module 10 — Shell + 8 modules
├── pages/               Routes publiques et admin
├── App.tsx              Module 11 — Router + Providers
└── main.tsx             Entry point

supabase/
├── migrations/          Schéma SQL + RLS
├── functions/           Edge Functions (emails)
└── config.toml           Config locale Supabase
\`\`\`

## Règles

1. Un module = une responsabilité
2. Les données descendent (contexts → composants)
3. Les sections sont indépendantes
4. Admin et public ne se mélangent pas
5. Les icônes sont centralisées dans lib/icons
6. Le RBAC est un gate, pas un composant
7. Le thème est un singleton contextuel
8. La validation est inline

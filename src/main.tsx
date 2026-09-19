import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

/*
  BRANCHEMENT DU CMS — à faire AVANT le premier rendu.

  `register-sections` remplit la table « type de section → composant » du
  renderer. Sans cet import, `SectionRenderer` ne trouve AUCUN composant et se
  rabat sur `SectionFallback` : le site public n'affiche alors rien pour les
  sections qui dépendent d'un module (`menu`, `blog`) et un rendu générique
  pour les autres. C'est exactement ce qui se produisait.

  Pourquoi ici, et pas dans `@/cms/renderer` : ce module importe les composants
  de section, qui dépendent de `SiteContext` → `lib/supabase` → `import.meta.env`.
  L'importer depuis le renderer casserait son isomorphisme, qui est requis pour
  la génération statique (décision CM-7 / AR-10). Le point d'entrée de
  l'application est donc le bon endroit : il est, par nature, côté navigateur.

  Le contrôle est automatisé : `npm run verify:lot1`, contrôle F.
*/
import '@/cms/register-sections'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

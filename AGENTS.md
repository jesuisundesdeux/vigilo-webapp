# AGENTS.md — vigilo-webapp

Informations pour les agents IA (et les humains) qui travaillent sur ce dépôt.

## Le projet

Application web de [Vigilo](https://vigilo.city), publiée sur [app.vigilo.city](https://app.vigilo.city) (installable en
PWA) : consulter, filtrer et signaler les observations (problèmes de déplacement à pied / à vélo) d'un territoire, et
modérer quand on a une clé admin/modérateur. Elle parle à l'API de l'**instance** choisie (backend
[vigilo-backend](https://github.com/jesuisundesdeux/vigilo-backend), une instance par association).

- La liste des instances vient de [vigilo-conf](https://github.com/jesuisundesdeux/vigilo-conf) (`main/citylist.json`,
  seulement `prod: true` sauf en mode beta).
- Les catégories viennent de l'instance (`get_categories.php`, backend ≥ 0.0.23 : catégories propres, désactivées,
  `catresolvable`) avec **repli** sur la liste nationale de vigilo-conf (`main/categorielist.json`) pour les instances
  pas à jour.
- Instance choisie : `localStorage['vigilo-instance']`, ou `?instance=<nom>` dans l'URL. `?beta` affiche aussi les
  instances de test, `?dev` utilise un backend local (`http://127.0.0.1`).
- `stats-iframe.html` : page de statistiques intégrable (utilisée par vigilo.city) ; fond transparent, envoie sa
  hauteur à la page parente (`postMessage({type: 'vigilo-stats-height', height})`).

## Organisation

| Chemin | Contenu |
|---|---|
| `src/js/main.js` | Point d'entrée (CSS, gestion globale des erreurs d'image, lancement de `app.js`) |
| `src/js/app.js` | Initialisation : instance, i18n, navigation, formulaire, liste, carte, filtres, statistiques |
| `src/js/vigilo-config.js` | Instances et catégories (vigilo-conf / instance), version, instance courante |
| `src/js/vigilo-api.js` | Appels à l'API du backend (`get_issues.php`, `create_issue.php`, `add_image.php`, `approve.php`…) |
| `src/js/dataManager.js` | Filtres appliqués aux observations (`filterIssues`, `periodStart`, `issueStatus`) |
| `src/js/issue-filter.js`, `issue-list.js`, `issue-map.js`, `form.js`, `stats.js`, `admin.js` | Filtres, liste, carte, formulaire d'envoi, statistiques, modération |
| `src/js/image-drawable.js`, `panoramax.js`, `panoramax-capture.js` | Éditeur de photo du formulaire ; vues Panoramax (fiche, photo prise dans une vue) |
| `src/js/localDataManager.js` | Stockage local : jetons/secretid des observations envoyées, clé admin, langue, modes beta/dev |
| `src/html/` | Gabarits HTML (inclus avec `${require('./x.html')}`, voir `webpack/html-interpolate-loader.js`) et composants JS (`issue-card.js`…) |
| `src/css/` | SCSS : Materialize personnalisé, `theme-variables.scss` (couleurs), `theme.scss`, `dark.scss` (mode sombre), `main.scss` |
| `src/i18n/fr_FR.json`, `en_US.json` | Traductions (clés identiques dans les deux fichiers) |

Guide détaillé du code (modules, flux de données, pièges connus) : `doc/GUIDE_CODE.md`.

Bibliothèques : jQuery, Materialize (`@materializecss/materialize`), Leaflet, Chart.js, i18next, piexifjs. Pas de
framework (pas de React/Vue).

## Règles à respecter

- **Documentation** : toute modification du code s'accompagne, dans la même PR, de la mise à jour de la documentation
  concernée dans `doc/` (`GUIDE_CODE.md` : modules, flux, recettes) et de ce fichier si l'organisation ou les règles
  changent.
- **Compatibilité avec les instances** : toutes les instances ne sont pas à jour. Toute nouvelle route ou nouveau
  champ du backend doit avoir un repli (route en 404 → ancien comportement). Ne pas supposer une version de backend.
- **Sécurité** : échapper toute donnée venant de l'API ou de vigilo-conf avant de l'insérer dans le HTML
  (`escapeHtml` de `utils.js`, ou `.text()` jQuery). Les photos non approuvées restent celles pixelisées par le backend
  (`generate_panel.php`) sauf pour un modérateur.
- **Traductions** : tout texte affiché passe par i18n (`data-i18n="clé"` dans le HTML, `i18next.t('clé')` en JS,
  `data-i18n-attr` pour les attributs) ; ajouter la clé dans **les deux** fichiers de `src/i18n/`. Pluriels i18next :
  clés `_one` / `_other`. Éditer ces JSON en insérant des lignes (ne pas reformater tout le fichier).
- **Images** : une image en erreur passe sur `data-fallback`, puis sur l'image par défaut
  (`src/img/photo-missing.svg`) — voir `main.js`.
- **Mobile d'abord** : vérifier l'affichage à 390 px de large, en thème clair et sombre (`dark.scss`).
- **Langue** : interface et messages de commit en **français** ; commentaires du code en anglais, courts.

## Construire et tester

Node.js ≥ 22.15.

```sh
npm ci
npm run webpack          # construction dans dist/ (WEBPACK_MODE=production par défaut)
npm run server           # serveur de développement
docker compose up        # ou avec Docker (http://127.0.0.1)
```

Il n'y a pas de tests automatisés : la CI vérifie seulement la construction. Pour vérifier un changement, servir `dist/`
(par exemple `python3 -m http.server`) et le piloter dans un navigateur (Playwright), en définissant l'instance via
`localStorage['vigilo-instance']` (JSON d'une entrée de citylist avec `name`) et en simulant `citylist.json` si besoin.
Contrôler : aucune erreur JavaScript, affichage à 1280 et 390 px.

## Publication

`.github/workflows/deploy.yml` : à chaque push sur `master` (racine du site) et `develop` (`/develop`), construction et
publication sur la branche `gh-pages` (app.vigilo.city). Les pull requests sont seulement construites. Les noms de
fichiers contiennent un hash : pas de problème de cache après un déploiement.

Version de l'application : `package.json` (`npm --no-git-tag-version version patch|minor|major`).

## Dépôts liés

- [vigilo-backend](https://github.com/jesuisundesdeux/vigilo-backend) : API (`doc/REST_API.md`).
- [vigilo-conf](https://github.com/jesuisundesdeux/vigilo-conf) : instances et catégories nationales.
- [vigilo-website](https://github.com/jesuisundesdeux/vigilo-website) : site vigilo.city (intègre `stats-iframe.html`).

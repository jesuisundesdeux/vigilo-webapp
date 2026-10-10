# Guide du code de vigilo-webapp

Ce guide s'adresse à un développeur qui reprend l'application web de Vigilo (app.vigilo.city) sans la connaître. Il
décrit le code tel qu'il est, module par module, avec ses particularités et ses défauts connus. Pour les règles de
contribution (sécurité, traductions, compatibilité avec les instances), voir aussi `AGENTS.md`. L'API du backend est
documentée dans `vigilo-backend/doc/REST_API.md`.

Sommaire :

1. [Vue d'ensemble](#1-vue-densemble)
2. [Référence des modules](#2-référence-des-modules)
3. [Flux de données](#3-flux-de-données)
4. [Formulaire d'envoi d'une observation](#4-formulaire-denvoi-dune-observation)
5. [Mode modération](#5-mode-modération)
6. [Statistiques](#6-statistiques)
7. [Traductions (i18n)](#7-traductions-i18n)
8. [Styles](#8-styles)
9. [Stockage local et paramètres d'URL](#9-stockage-local-et-paramètres-durl)
10. [Construire, lancer, publier](#10-construire-lancer-publier)
11. [Recettes](#11-recettes)
12. [Pièges connus et dette technique](#12-pièges-connus-et-dette-technique)

---

## 1. Vue d'ensemble

### 1.1 Architecture

- Application **mono-page**, sans framework : jQuery 3, Materialize 1.2 (`@materializecss/materialize`, composants
  modaux, onglets, menus, sélecteurs de date), Leaflet 1.9 (cartes), Chart.js 4 (un seul graphique), i18next
  (traductions), piexifjs (lecture EXIF des photos), semver (comparaison des versions de backend).
- Tout le code passe par **un seul point d'entrée webpack**, `src/js/main.js`, qui importe aussi le CSS
  (`src/css/main.scss`).
- Deux pages HTML sont produites à partir de gabarits, par deux instances de `HtmlWebpackPlugin`
  (`webpack.config.js`) :

  | Page produite | Gabarit | Usage |
  |---|---|---|
  | `dist/index.html` | `src/html/index.html` | l'application |
  | `dist/stats-iframe.html` | `src/html/stats-iframe.html` | statistiques seules, intégrées en iframe par vigilo.city |

  Les **deux pages chargent le même bundle** `js/main.[contenthash].js` (injecté dans le `<head>` avec `defer`, donc
  exécuté après l'analyse du DOM) et la même feuille `css/styles.[contenthash].css`. Le code doit donc supporter
  l'absence d'éléments du DOM sur `stats-iframe.html` (voir [§6.3](#63-mode-intégré-stats-iframehtml)).
- Pas d'appel serveur propre : l'application parle directement à l'API de l'instance choisie (CORS ouvert côté
  backend), à `raw.githubusercontent.com` (vigilo-conf), à Nominatim (géocodage, via `leaflet-control-geocoder`), à
  Panoramax et aux serveurs de tuiles.

### 1.2 Gabarits HTML et chargeur `html-interpolate-loader`

Les fichiers `.html` sont traités par `webpack/html-interpolate-loader.js`, qui transforme le fichier en module JS
exportant le HTML comme **littéral de gabarit** :

```js
module.exports = function (source) {
	const escaped = source.replace(/\\/g, "\\\\").replace(/`/g, "\\`");
	return "module.exports = `" + escaped + "`;";
};
```

Conséquences :

- `${require('./navs.html')}` dans un gabarit inclut un autre gabarit ; `${require('../img/x.png')}` donne l'URL de
  l'image produite par webpack ; `${require('../../package.json').version}` insère la version (voir `navs.html`).
- Tout `${...}` dans un `.html` est **évalué au moment de la construction**. Le chargeur échappe les `\` et les
  accents graves, pas `${` : pour afficher un `${` littéral, écrire `&#36;{`.
- Le suffixe `?inline` sur une image (`vigilo-wordmark.png?inline`) l'incorpore en `data:` URI (règle
  `asset/inline`), utilisé pour l'écran de chargement ; sans suffixe, l'image est copiée dans `dist/img/`.

Inclusions actuelles :

```
index.html
├── navs.html            barre du haut + menu latéral (#mobile-menu)
├── #issues : issues.html  onglets Liste/Carte, boutons flottants
│   ├── spinner.html     cartes squelettes pendant le chargement
│   └── filters.html     fenêtre des filtres (#modal-filters)
├── #stats : stats.html  page des statistiques
└── #modal-form : form.html  formulaire d'envoi
stats-iframe.html
└── stats.html
```

Les fichiers JS de `src/html/` (`issue-card.js`, `issue-detail.js`, `error.js`,
`github_issue.js`) sont des **composants** : des fonctions qui renvoient une chaîne HTML (littéraux de gabarit
exécutés dans le navigateur, donc toute donnée externe doit y passer par `escapeHtml`).

Fenêtres (`.modal`) : chacune reçoit une **croix de fermeture** en haut à droite (`src/js/modal-cross.js`,
`addModalCrosses()` appelé par `app.js` après `i18n.init()` ; lien `.modal-close.modal-x`, que Materialize ferme
tout seul). `#modal-issue` étant reconstruite à chaque ouverture, `viewIssue()` rappelle `addModalCross()`. Seule
`#modal-form-loader` (envoi en cours) n'en a pas.

### 1.3 Séquence de démarrage

1. Le navigateur affiche `index.html` : l'écran de chargement `#app-splash` (styles en ligne, fond jaune `#fdd835`,
   classe `splash` sur `<html>`). Un petit script en ligne affiche sous le logo le nom de l'instance mémorisée
   (`localStorage['vigilo-instance']`). Un autre, dans `<head>`, applique le thème (`data-theme="light|dark"` sur
   `<html>`, d'après `localStorage['vigilo-theme']` et `prefers-color-scheme`) avant l'affichage, sans flash clair.
2. Le bundle s'exécute. Les `import` ES étant remontés, **tous les modules sont évalués avant le corps de
   `main.js`**. Plusieurs ont des effets de bord à l'évaluation :
   - `vigilo-config.js` : `window.setInstance` ;
   - `i18n.js` : `window.setLang` ;
   - `issue-list.js` : `window.viewIssue` ; `issue-map.js` : `window.centerOnIssue` ;
   - `form.js` : `window.startForm` et les gestionnaires jQuery du formulaire (`change` des champs fichier, `paste`
     sur `document`, `change` de `#issue-cat`, `submit` du formulaire) ;
   - `issue-detail.js` : `window.deleteIssue`, `window.shareIssue` ;
   - `install.js` : écoute de `beforeinstallprompt` et `appinstalled` ;
   - `splash.js` : minuterie de 20 s qui masque l'écran de chargement quoi qu'il arrive ;
   - `localDataManager.js` : lecture de `localStorage['vigilo-localdata']` ;
   - `dataManager.js` : lecture du paramètre d'URL `?comment=`.
3. Corps de `main.js` : `window.$ = $`, correctif des icônes Leaflet pour webpack, `window.WE_ARE_ON_A_MOBILE`,
   gestionnaire global d'erreur d'image (voir [§3.5](#35-images-et-replis)), puis
   `window.vigilo = new VigiloApp()` et `window.vigilo.init().catch(console.error).finally(hideSplash)`.
4. `VigiloApp.init()` (`app.js`), dans l'ordre :

   | Étape | Code | Détail |
   |---|---|---|
   | Traductions | `await i18n.init()` | charge les catégories (pour leurs noms), initialise i18next, applique la langue mémorisée |
   | Modes | `?beta` → `localDataManager.setBeta()`, sinon `?dev` → `setDev()` | stockés en `sessionStorage` |
   | Instances | `await vigiloconfig.getInstances()` | remplit la liste de `#modal-zone` ; un clic appelle `window.setInstance(nom)` |
   | `?instance=` | `await window.setInstance(nom, true)` si différent de l'instance courante | enregistre sans recharger |
   | Pas d'instance | `hideSplash()` puis ouverture de `#modal-zone`, et `return` | l'application s'arrête là jusqu'au choix |
   | Titre | `document.title`, nom ajouté au logo de la barre | |
   | Modération | `await admin.init()` | clé, `acl.php`, entrée du menu |
   | Menu latéral | `navs.init()` (non attendu) | onglets, installation, version du serveur |
   | Formulaire | `form.init()` (non attendu) | catégories du `<select>`, sélecteurs date/heure |
   | Statistiques | `stats.init()` (non attendu) | |
   | Liste / carte | onglets `#issues .tabs`, `await map.init()`, fenêtre `#modal-issue`, défilement infini, bouton flottant | |
   | Filtres | `$(dataManager).on('filterchange', ...)` puis `await filters.init()` | |
   | `?token=` | `await list.viewIssue(token)` | ouvre la fiche de l'observation |
   | Affichage | `await list.displayIssues(30)`, `hideSplash()`, `await map.displayIssues()` | |
   | Lien « Signaler un bug » | remplace le gabarit GitHub par un corps prérempli (`github_issue.js`) | |

5. L'écran de chargement (`splash.js`) affiche « Chargement des observations » (`setSplashStatus`) puis disparaît
   (`hideSplash`) : après la première page de la liste, quand il faut choisir un territoire, à la fin (même en
   erreur) de `init()`, ou au bout de 20 s.

### 1.4 PWA et installation

- Le manifeste est produit par `webpack-pwa-manifest` (nom, couleurs `#fdd835`, icônes générées depuis
  `src/img/icon.png`, dont des icônes `maskable`). Il n'y a **pas de service worker** : pas de fonctionnement hors
  ligne.
- `install.js` gère l'installation : il garde l'événement `beforeinstallprompt`, affiche la bannière
  `#install-banner` et l'entrée `#install-app` du menu quand l'installation est possible (ou sur iOS, où un toast
  explique la marche à suivre), mémorise la fermeture de la bannière (`localStorage['vigilo-install-dismissed']`) et
  ajuste la variable CSS `--install-banner-h` pour décaler les boutons flottants.

---

## 2. Référence des modules

### 2.1 `src/js/`

| Fichier | Rôle |
|---|---|
| `main.js` | point d'entrée (voir §1.3) |
| `app.js` | classe `VigiloApp`, méthode `init()` : orchestration du démarrage |
| `vigilo-config.js` | instances, catégories, instance courante, constantes de version |
| `vigilo-api.js` | appels à l'API du backend |
| `utils.js` | requêtes HTTP avec cache, échappement, jetons aléatoires, distance, adresse aplatie |
| `similar-issues.js` | observations similaires de la fiche d'une observation |
| `related-issues.js` | observations proposées dans une résolution (filtres, sélection) |
| `theme.js` | mode sombre : choix automatique / clair / sombre, bouton du menu |
| `dataManager.js` | état des filtres et filtrage des observations |
| `localDataManager.js` | stockage local (jetons, clé, langue, modes) |
| `issue-list.js` | liste paginée, fiche d'une observation |
| `issue-map.js` | carte des observations |
| `issue-minimap.js` | petite carte de la fiche d'une observation |
| `issue-filter.js` | fenêtre des filtres |
| `form.js` | formulaire d'envoi / de modification |
| `image-drawable.js` | outil de dessin sur la photo (masquer un visage, une plaque) |
| `admin.js` | mode modération |
| `stats.js` | statistiques |
| `i18n.js` | traductions |
| `navs.js` | menu latéral |
| `splash.js` | écran de chargement |
| `install.js` | installation de la PWA |
| `panoramax.js` | recherche et affichage d'une vue Panoramax |
| `panoramax-capture.js` | photo d'une observation prise dans une vue Panoramax (formulaire) |
| `map-layers.js` | fonds de carte communs |
| `circle-marker-dynamic.js` | marqueur circulaire dont la taille suit le zoom |
| `timedout-marker.js` | marqueur « viseur » temporaire |

#### `app.js`

- Export par défaut : `class VigiloApp` avec `async init()`. Instance exposée en `window.vigilo`.
- Écoute `filterchange` sur `dataManager` : vide liste et carte puis les réaffiche (`list.displayIssues(30)`,
  `map.displayIssues(true)`, sans recadrer la carte).
- Défilement infini : sur `$(window).scroll`, si le bas de page est à moins de 10 px, `list.displayIssues(30)`.
- Onglets Liste/Carte : `onShow` appelle `map.focus()` (recalcule la taille de la carte, cadre les observations la
  première fois).

#### `vigilo-config.js`

| Export | Description |
|---|---|
| `getInstances(all)` | liste des instances depuis `citylist.json` de vigilo-conf, en tableau d'objets `{api_path, scope, prod, country, name}` (`name` = clé du JSON). Filtrée sur `prod` sauf mode beta ou `all` défini. En mode dev : une seule instance `Dev` (`api_path: http://127.0.0.1`, `scope: XX_dev`) |
| `getCategories()` | promesse, mise en cache dans le module, d'un objet `{catid: {id, name, i18n, color, disable, resolvable, custom}}` (voir §3.1) |
| `getInstance()` | objet de l'instance courante lu dans `localStorage['vigilo-instance']`, ou `null` |
| `VERSION` | `"vigilo-webapp-<version>"`, envoyé dans le champ `version` de `create_issue.php` |
| `VERSION_NUMBER` | version de `package.json` |
| `IMAGE_MAX_SIZE` | 1500 : plus grand côté de la photo envoyée, en pixels |
| `window.setInstance(name, noreload)` | enregistre l'instance de ce nom (recherchée dans `getInstances(true)`) ; sans `noreload`, recharge la page en retirant `?instance=` de l'URL s'il y est |

Constante interne `RESOLVABLE_CATEGORIES = [2,3,4,5,6,7,8,11,100]` : repli quand une catégorie n'a pas de
`catresolvable`.

#### `utils.js`

| Export | Description |
|---|---|
| `request(options, nocache)` | requête XHR ; `options` est une URL ou `{url, method, headers, body}`. Avec `Content-Type: application/x-www-form-urlencoded` et un `body` objet, le corps est encodé. Résout le JSON de la réponse. Cache des GET (voir §3.2) |
| `escapeHtml(value)` | échappe `& < > " '` ; `null`/`undefined` → `""` |
| `safeToken(token)` | ne garde que `[A-Za-z0-9_-]` : pour insérer un jeton dans un `onclick="viewIssue('...')"` |
| `randomToken(alphabet, length)` | chaîne aléatoire (`crypto.getRandomValues`) |
| `distance(lat1, lng1, lat2, lng2)` | distance en mètres (haversine, rayon 6 378 137 m) ; utilisée par `form.js` et `similar-issues.js` |
| `flatString(value)` | minuscules, sans accents ni caractères autres que `a-z0-9` : comparaison d'adresses |
| `instancePageUrl(name)` | page du territoire sur vigilo.city : `https://vigilo.city/fr/instance/<slug du nom de l'instance>/`, alias stable créé par vigilo-website (mêmes règles de slug que `slugify()` de `scripts/fetch_instances.py`) qui redirige vers la page de l'instance |

`request` rejette (avec une chaîne `HTTP Code: ...` contenant le corps de la réponse) si le code HTTP n'est pas 200,
si le corps n'est pas du JSON, ou si le JSON contient un `status` différent de `0` (comparaison souple : `"0"`
convient).

#### `vigilo-api.js`

Toutes les URL partent de `decodeURIComponent(getInstance().api_path)`.

| Export | Route | Remarques |
|---|---|---|
| `getIssues(options)` | `GET get_issues.php?<options>&scope=<scope>` | enrichit chaque observation (§3.3) ; une seule entrée par jeton (`uniqueIssues()` : avant le backend 0.0.27, une observation liée à plusieurs résolutions revenait une fois par résolution ; le statut le plus avancé est gardé, résolue > indiquée résolue > en cours > prise en compte) ; cache par URL (`issue_cache`) |
| `createIssue(data, key)` | `POST create_issue.php[?key=]` | formulaire urlencodé ; génère `data.token` (8 caractères) si absent |
| `createResolution(data)` | `POST create_resolution.php` | idem, sans clé |
| `addImage(token, secretId, data, isResolution, key)` | `POST add_image.php` | `data` = JPEG en base64 ; choisit la méthode selon `backend_version` (§4.6) ; `key` = clé de modération (`&key=`), nécessaire pour remplacer la photo d'une observation approuvée (sinon 403 `ALREADYAPPROVED`) |
| `acl(key)` | `GET acl.php?key=` | rôle de la clé |
| `approve(key, token, status)` | `GET approve.php?key=&token=&approved=` | jamais mis en cache (`nocache`) |
| `deleteIssue(token, secretId)` | `GET delete.php?secretid=&token=` | |
| `getScope()` | `GET get_scope.php?scope=` | bornes de la zone, `backend_version`, `cities`, `display_name` ; mis en cache par `request` |

#### `dataManager.js`

| Export | Description |
|---|---|
| `periodStart(period, now)` | date de début d'une période `"<n>d"`, `"<n>m"`, `"<n>y"` (mois et années calendaires), `null` pour autre chose (`"all"`) |
| `issueStatus(issue)` | `unapproved` (approved 0), puis pour approved 1 selon `status` : 0 `unresolved`, 1 `resolved`, 2 `taked`, 3 `inprogress`, 4 `done` ; sinon `unknow` (observation refusée, approved 2) |
| `filterIssues(issues, filters)` | filtre pur (sans état), voir §3.4 |
| défaut : instance de `DataManager` | état des filtres + `getData()` + `setFilter()` ; déclenche l'événement jQuery `filterchange` |

`DataManager` garde les propriétés `dow`, `hour`, `categories`, `status`, `age`, `onlyme`, `cities`, `comment`
(liste `KEYS`). `getData()` renvoie `filterIssues(await vigilo.getIssues(), this.filters())`. `setFilter(obj)` copie
les clés qui changent (comparaison par `JSON.stringify`) et déclenche `$(dataManager).trigger('filterchange')` s'il y
a eu un changement.

#### `localDataManager.js`

Singleton `LocalDataManager`, données persistantes dans `localStorage['vigilo-localdata']` (objet `{tokens, lang,
adminKey}`) et drapeaux de session :

| Méthode | Stockage |
|---|---|
| `getTokenSecretId(token)` / `setTokenSecretId(token, secretId)` | `tokens[token]` : `secretid` des observations envoyées depuis ce navigateur |
| `getLang()` / `setLang(lang)` | `lang` |
| `getAdminKey()` / `setAdminKey(key)` | `adminKey` |
| `isAdmin()` / `setIsAdmin(bool)` | `sessionStorage['vigilo-isAdmin']` (mode modération actif) |
| `isBeta()` / `setBeta()` | `sessionStorage['vigilo-beta']` |
| `isDev()` / `setDev()` | `sessionStorage['vigilo-dev']` |
| `userCanEdit(issue)` | vrai si le `secretid` est connu et l'observation non approuvée |
| `setVersion(version)` | `localStorage['vigilo-version']` ; **jamais appelée** |

#### `issue-list.js`

| Export | Description |
|---|---|
| `cleanIssues()` | vide `#issues .cards-container`, remet `offset` à 0 |
| `displayIssues(count)` | ajoute les `count` observations filtrées suivantes (`offset` interne) avec `issueCard()` ; retire les cartes squelettes ; message `no-issue` si aucune ; en erreur, remplace **tout `#issues`** par `errorCard(e)` |
| `viewIssue(token)` (aussi `window.viewIssue`) | ouvre la fiche : cherche dans toutes les observations (non filtrées), sinon `getIssues({token})` ; injecte `issueDetail()`, branche la photo sur `openPhotoViewer()` (clic, Entrée ; pas pour l'image « photo manquante »), réécrit l'URL avec `permLink` (`history.replaceState`), remet la croix (`addModalCross`), ouvre `#modal-issue`, lance la mini-carte et la recherche Panoramax, remplit `.similar-issues` avec `findSimilarIssues()` sur toutes les observations chargées |
| `refreshIssueCard(issue)` | réaffiche une carte en place après une action de modération ; si elle ne correspond plus aux filtres, la retire et charge l'observation suivante |

`refreshIssueCard` retrouve la carte par le sélecteur `.card[onclick="viewIssue('<token>')"]` : ne pas changer
l'attribut `onclick` de `issue-card.js` sans adapter ce sélecteur.

#### `similar-issues.js`

Remplace la page `mosaic.php` du backend (supprimée en 0.0.26). Mêmes règles que la recherche « Similaires » de
l'admin (`sameas()` du backend) : **même catégorie**, et **à moins de `SIMILAR_DISTANCE` (300) m** ou **à la même
adresse dans la même ville** (`flatString` de `address` et `cityname`). Calculé dans le navigateur sur la liste déjà
chargée (`getIssues()` sans paramètre, donc les observations que l'instance rend publiques), sans appel au backend.

| Export | Description |
|---|---|
| `findSimilarIssues(issue, issues)` | observations similaires, la plus proche d'abord, avec `similar_distance` (m) |
| `similarIssuesHtml(similar)` | section de la fiche : titre avec le nombre, règle appliquée, grille de vignettes (`img_thumb`, repli `img_thumb_panel`) qui ouvrent la fiche (`viewIssue`), distance et date |

#### `theme.js`

Choix mémorisé dans `localStorage['vigilo-theme']` : `auto` (défaut, suit `prefers-color-scheme`), `light` ou
`dark`. Le thème effectif est l'attribut `data-theme` de `<html>` (posé d'abord par le script en ligne de
`index.html`, voir §1.3), sur lequel s'appuient les styles de `dark.scss`.

| Export | Description |
|---|---|
| `getThemeChoice()` | choix mémorisé (`auto` si absent ou illisible) |
| `isDark(choice)` | thème sombre effectif pour ce choix |
| `applyTheme(choice)` | pose `data-theme`, met à jour l'icône et le libellé de `#theme-toggle` (clés `theme-auto`, `theme-light`, `theme-dark`) |
| `setThemeChoice(choice)` | mémorise puis applique |
| `initTheme()` | appelée par `app.js` après `i18n.init()` : applique le choix, suit les changements du système en mode `auto`, fait tourner auto → clair → sombre au clic sur `#theme-toggle` (menu latéral) |

#### `issue-map.js`

| Export | Description |
|---|---|
| `init()` | crée la carte Leaflet `#issues-map` (vue initiale sur Montpellier, `[43.605413, 3.879568]`, zoom 11), fonds `addBaseLayers` ; exposée en `window.issuesmap` |
| `focus()` | `invalidateSize()` ; au premier appel, cadre la carte sur les observations |
| `cleanIssues()` | vide et retire la couche des observations |
| `displayIssues(nozoom)` | crée une `L.featureGroup` de `L.circleMarkerDynamic` (remplissage à la couleur de la catégorie, contour blanc) ; clic → `viewIssue` ; cadre sauf `nozoom === true` |
| `centerOnIssue(token)` (aussi `window.centerOnIssue`) | zoom 18 sur l'observation (cherchée dans les observations **filtrées**), viseur temporaire `L.timedOutMarker`, bascule sur l'onglet Carte, ferme la fiche |

Les tailles des cercles par niveau de zoom sont dans la constante `STYLES` (`"0-11"`, `"12-13"`, `"14-15"`,
`"16-20"`), interprétée par `circle-marker-dynamic.js`.

#### `issue-minimap.js`

- `showIssueMiniMap(container, caption, issue)` : carte non interactive à la molette dans la fiche, cercle de 500 m
  (`NEARBY_RADIUS_M`), observations **filtrées** situées dans ce rayon (clic → `viewIssue`), marqueur de l'observation
  (clic → `centerOnIssue`), légende `nearby-none` / `nearby-one` / `nearby-other`. Une seule mini-carte existe à la
  fois (détruite à l'ouverture suivante).
- `refreshIssueMiniMap()` : `invalidateSize()`, appelé par `onOpenEnd` de `#modal-issue` (`app.js`).

#### `issue-filter.js`

- `init()` : construit les puces de catégories (désactivées seulement si des observations les utilisent) et de
  communes (`scope.cities` triées par population décroissante, seulement si les observations ont un `cityname`),
  affiche les compteurs par valeur, branche les liens « Tout / Aucun » (`[data-toggle-group]`), le bouton
  `#filters-reset`, le résumé `#filters-summary` (« N observations », pluriel i18next). Les filtres sont appliqués à
  la **fermeture** de `#modal-filters` (`onCloseStart` → `dataManager.setFilter(readFilters())`).
- En mode modération, coche seulement `unapproved` et règle `dataManager.status = ['unapproved']` directement (sans
  événement), avec un toast `moderator-default-filter`.
- `checkedValues(name)` : `[]` si tout est coché (= pas de filtre, pour garder les observations dont la catégorie ou
  la commune est inconnue de la configuration), `["-"]` si rien n'est coché (ne correspond à rien), sinon les valeurs.

#### `form.js`

Voir [§4](#4-formulaire-denvoi-dune-observation). Export : `init()`. Global : `window.startForm(token)`.

#### `photo-drafts.js`

Photos en brouillon, **sur mobile seulement** (`WE_ARE_ON_A_MOBILE`, et IndexedDB disponible). Android retire la
position GPS de toutes les photos remises à une page web (issue #128) : la position vient ici de la géolocalisation
du navigateur, au moment de la prise de vue, pas de la photo.

- Boutons à côté du « + » (`issues.html`) : `#draft-camera-btn` (appareil photo du téléphone, champ caché
  `#draft-camera-input` avec `capture`) et `#drafts-btn` (galerie, avec le nombre de brouillons, masqué sans
  brouillon).
- Prise de vue : la position est demandée **au clic** (avant l'ouverture de l'appareil photo), puis une seconde fois
  au retour ; la plus précise est gardée (`bestPosition`). La photo est réduite à 1500 px (JPEG 0,9) et enregistrée
  dans IndexedDB (base `vigilo-drafts`, magasin `drafts` : `{id, instance, image (Blob), lat, lon, accuracy, date}`),
  avec `navigator.storage.persist()`. Sans position (refusée, indisponible) : `lat`/`lon` à `null`.
- Galerie `#modal-drafts` (`index.html`, bas de l'écran) : brouillons de l'instance courante, les plus récents
  d'abord, avec date, précision (« ± n m » ou « sans position ») et suppression ; bouton pour une nouvelle photo.
- Un clic sur une photo appelle `window.startFormFromDraft(draft)` (`form.js`) : formulaire d'une nouvelle
  observation avec la photo (éditable), le point (`setFormMapPoint`, adresse retrouvée), la date et l'heure de la
  prise de vue. Le brouillon est supprimé (`deleteDraft`) une fois l'observation envoyée.
- Limites : les brouillons restent dans le navigateur du téléphone (effacés avec les données du site ; sur iPhone,
  Safari peut les effacer après 7 jours sans utilisation si l'appli n'est pas installée).

#### `image-drawable.js`

`ImageDrawable(div)` (export par défaut) crée un `ClassImageDrawable` sur le `<canvas>` contenu dans `div`
(`#picture-preview`). Un clic sur l'aperçu le passe en plein écran (classe `fullscreen`, styles dans
`image-drawable.scss`) avec deux barres :

- en haut : annuler, rétablir, rotation gauche / droite, terminer ;
- en bas : outils **crayon** (trait libre), **flèche**, **cercle** (ellipse dans le rectangle tracé, pour entourer),
  **flouter** (rectangle réduit puis agrandi, sans `ctx.filter` que Safari ne gère pas), **épaisseur** (trois tailles
  relatives au plus grand côté, `SIZES`), **couleur** (rouge, jaune par défaut, vert, bleu, noir, blanc).

Le dessin (événements `pointer*`, souris et tactile) s'applique directement sur le canvas, qui est ensuite celui envoyé
au serveur : c'est l'outil qui permet à l'auteur de masquer un visage ou une plaque. Les formes sont prévisualisées en
repartant de l'image d'avant le geste ; un geste trop court ne dessine rien. Historique : `backHistory` / `upHistory`
(images `ImageData` + rotation, 10 étapes), la rotation compte comme une étape. Les gestionnaires sont dans l'espace
de noms `.drawable` (et `.drawable-edit` en plein écran) : une nouvelle photo remplace l'éditeur de la précédente.

**Zoom** : en plein écran, un doigt dessine, deux doigts zooment et déplacent la photo (jusqu'à ×8, `MAX_ZOOM`) ; un
trait commencé par le premier doigt est annulé quand le second se pose (`cancelDraw`). Molette sur ordinateur. Le
zoom est une transformation CSS du canvas (`translate` + `scale`, `view`) : `point()` lit la position transformée,
le dessin reste donc exact. Les événements sont écoutés sur l'éditeur (`div`, `touch-action: none`), le dessin ne
commence que sur le canvas. Le zoom revient à 1 à la fermeture et après une rotation.

Aperçu dans le formulaire : `#picture-preview canvas` sur toute la largeur de la carte, hauteur au plus
`min(55vh, 420px)`.

#### `admin.js`

Voir [§5](#5-mode-modération). Export : `init()`. Global (en mode modération) : `window.adminApprove(token, status)`.

#### `stats.js`

Voir [§6](#6-statistiques). Export : `init()`.

#### `i18n.js`

Voir [§7](#7-traductions-i18n). Export : `init()`. Global : `window.setLang(lang)`.

#### `navs.js`

`init()` : `M.Sidenav` sur `#mobile-menu`, `M.Tabs` sur ses onglets (le menu se ferme au changement d'onglet),
`install.init()`, affiche l'entrée « Ce territoire sur vigilo.city » (`#instance-page`, lien `instancePageUrl()` du
nom de l'instance courante), puis ajoute `backend_version` (de `get_scope.php`) au texte et au lien de
`#version-server`.

Les onglets du menu (`navs.html`) sont des onglets Materialize : `href="#issues"` et `href="#stats"` affichent l'un
ou l'autre des blocs de `#content` dans `index.html`. Les entrées « Zone géographique » et « Langue » ouvrent des
fenêtres (`modal-trigger`).

#### `splash.js`

`setSplashStatus(text)`, `hideSplash()` (idempotent, retire l'élément après la transition). Minuterie de secours de
20 s.

#### `install.js`

`init()` : branche les boutons ; le reste est décrit au §1.4.

#### `panoramax.js`

- `findPanoramaxPicture(lat, lon)` : interroge le catalogue fédéré `https://explore.panoramax.fr/api` (lien `search`
  de la page STAC, sinon `/api/search`) avec une boîte de ±0,0005° (~50 m, 100 résultats au plus), garde la photo la **plus récente** (jour de
  `properties.datetime`), et parmi celles de ce jour la plus proche. Résout
  `{id, url, embedUrl}` ou `null` (aussi en cas d'erreur). Résultats en cache par coordonnées.
- `openPanoramaxViewer(picture)` : ouvre `#modal-panoramax` avec la visionneuse en iframe ; l'iframe repasse à
  `about:blank` à la fermeture.
- `findPicturesAround(lat, lon, dates)` : photos dans ±0,001° (~100 m), la plus proche d'abord (tableau vide en cas
  d'erreur) ; `dates` facultatif `{from, to}` (dates, l'une ou l'autre `null`) : paramètre STAC `datetime` envoyé à
  l'API (nouvelle requête sans lui si elle le refuse) et date de chaque photo vérifiée dans le navigateur ; `fetchPicture(href)` : photo d'un item STAC (suivante / précédente d'une séquence).
- `pictureFromItem(item)` : normalise un item STAC : `id`, `lat`, `lon`, `datetime`, `azimuth` (`view:azimuth`),
  `is360` (`pers:interior_orientation.field_of_view` ≥ 360), images `sd` / `hd` / `thumb` (assets), `producer`
  (`geovisio:producer`, sinon fournisseur `producer`), `license`, `next` / `prev` (liens de la séquence), `url`,
  `correction` : correction d'orientation calculée comme la visionneuse officielle (`getSphereCorrection` du
  web-viewer Panoramax) depuis `pers:yaw` / `pers:pitch` / `pers:roll` (sinon les balises EXIF / XMP
  `GPano.Pose*Degrees`, `Camera.*`, `MPF*Angle`), appliquée aux photos plates qui ont un pitch ou un roll et aux 360°
  qui ont les deux : `{pan: yaw, tilt: -pitch, roll}` en radians, sinon `null`.

#### `panoramax-capture.js`

`openPanoramaxCapture(location, scopeView, onCapture)` ouvre `#modal-panoramax-capture` (dans `index.html`) :

1. **localisation** : `location` (position déjà placée dans le formulaire), sinon position de l'appareil
   (`navigator.geolocation`) ; en attendant, ou si elle échoue, la carte montre la **vue par défaut de l'instance**
   (`scopeView` construit par `scopeView()` de `form.js` : `map_center_string` et `map_zoom` du scope, sinon ses
   bornes ; appliquée aussi à la fin de l'ouverture de la fenêtre, quand la carte a sa taille) et invite à cliquer ;
2. **vues à proximité** : `findPicturesAround()`, points jaunes sur une carte Leaflet ; un clic sur un point affiche la
   vue (date au survol), un clic ailleurs relance la recherche ; **filtre par date** (`.pnx-filters` : toutes, moins
   d'un an, moins de 3 ans, ou période « du … au … » en jours entiers) qui relance la recherche
   (`panoramax-capture-none-dates` si aucune vue) ; la vue courante est en rouge avec sa direction ; boutons
   précédente / suivante de la séquence (le cap regardé est conservé d'une photo 360° à l'autre) ;
3. **cadrage** (avec la `correction` d'orientation de la photo : en 360°, `renderEquirect` lit la texture à travers
   l'inverse de la rotation `Euler(tilt, pan, roll, "YXZ")` de photo-sphere-viewer ; une photo plate est redressée de
   son roll par `drawFlat`) dans un canvas 4:3 (glisser, molette, pincement, boutons de zoom) : une photo 360°
   (équirectangulaire) est reprojetée en perspective (`renderEquirect`, cap `yaw`, inclinaison `pitch`, champ `fov`) ;
   une photo plate est recadrée (`flatRegion`, centre et zoom) ;
4. **capture** à partir de l'image `hd` (`IMAGE_MAX_SIZE` de large au plus, interpolation bilinéaire en 360°) avec une
   bande de crédits en bas (`panoramax-capture-credit` : auteur, licence, date de la vue), puis
   `onCapture(dataUrl, picture, location)`.

Les images sont chargées avec `crossOrigin = "anonymous"` : Panoramax les sert avec CORS, sans quoi le canvas serait
« contaminé » et la vue refusée (`panoramax-capture-error`).

#### `map-layers.js`

`addBaseLayers(map, options)` : ajoute les fonds « Carte » (OSM France, par défaut), « OpenStreetMap », « Plan IGN » et
« Photos » (Géoplateforme IGN, sans clé) et le sélecteur de couches (sauf `options.control === false`). Si OSM France
échoue 3 fois sans aucune tuile chargée, bascule sur OpenStreetMap, affiche une fois le toast `map-tiles-fallback` et
utilise directement ce fond pour les cartes créées ensuite (`defaultUnavailable`).

#### `circle-marker-dynamic.js`, `timedout-marker.js`

Extensions Leaflet enregistrées sur l'objet global `L` : `L.circleMarkerDynamic(latlng, {styles, ...})` (style
appliqué selon le zoom courant) et `L.timedOutMarker(latlng)` (icône `src/img/crosshair.png`, s'efface après 1 s,
retirée après 3 s).

### 2.2 Composants de `src/html/`

| Fichier | Export par défaut | Utilisé par |
|---|---|---|
| `issue-card.js` | `(issue) => string` : carte de la liste, `onclick="viewIssue('<token>')"`, icônes d'état, pastille de catégorie, commentaire mis en avant (`.card-comment`, 3 lignes au plus, absent si vide), adresse, date (`data-i18n-date`) | `issue-list.js` |
| `issue-detail.js` | `async (issue) => string` : contenu de `#modal-issue` : en-tête (catégorie, pastilles d'état, phrase d'état), photo + bouton Panoramax, commentaire mis en avant sous la photo (`.issue-quote` : citation en grand, explication en dessous, absent si les deux sont vides), tableau adresse / date / référence, mini-carte, observations similaires, pied (actions principales, partager, menu « ⋮ ») | `issue-list.js` |
| `error.js` | `(e) => string` : carte d'erreur, détail échappé | liste, filtres, formulaire, fiche |
| `github_issue.js` | `async () => string` : corps pré-rempli (URL-encodé) d'un ticket GitHub (navigateur, territoire, versions) | `app.js` |

`issue-detail.js` définit aussi deux globales :

- `window.deleteIssue(token)` : suppression par l'auteur avec son `secretid`, puis rechargement après 1 s ;
- `window.shareIssue(link)` : partage natif (`navigator.share`), sinon copie dans le presse-papiers, sinon suit le
  lien.

Actions de la fiche : les **principales** sont des boutons à texte à gauche du pied (`.issue-primary`), les autres
dans le **menu « ⋮ »** (`.issue-more` ouvre `.issue-menu`, `role="menu"`, au-dessus du pied ; fermé par un clic
ailleurs ou sur un élément, flèches haut/bas pour naviguer). Le partage (`shareIssue`) reste un bouton à icône. La
fermeture est la croix en haut à droite (`modal-cross.js`).

| Cas | Boutons principaux | Menu « ⋮ » |
|---|---|---|
| toujours | | voir sur la carte (`centerOnIssue`), observations similaires (défile jusqu'à `.similar-issues`), voir sur OpenStreetMap, **signaler** (`.report-btn`, lien `mailto:` vers `contact_email` de `get_scope.php`, objet `report-issue-subject`, corps `report-issue-body` : référence, catégorie, adresse, date, commentaire, lien, motif à compléter) |
| observation publiée, dans aucune résolution (`status == 0`), catégorie résoluble (backend ≥ 0.0.14) | **Résoudre** : `startResolution(token)` (§4.5) | |
| mode modération, `approved == 0` | **Valider** (`adminApprove(t,'1')`), **Refuser** (`'2'`) | modifier (`startForm(t)`) |
| mode modération, `approved == 1` | (Résoudre si possible) | modifier (`create_issue.php` garde l'état de modération), remettre à modérer (`'0'`), refuser |
| mode modération, `approved == 2` | **Valider** | remettre à modérer |
| auteur (`userCanEdit`) et backend ≥ 0.0.17 | | supprimer (`deleteIssue`) |

Photo en plein écran (`src/js/photo-viewer.js`, `openPhotoViewer(src, alt)`) : calque `#photo-viewer` (fond noir,
`touch-action: none`, plein écran du navigateur quand il l'accepte, pas sur iPhone), zoom à deux doigts et
déplacement (événements `pointer*`, transformation `translate` + `scale` de l'image, bornée pour ne pas laisser de
bord vide), double tap / double clic pour zoomer ×2,5 ou revenir, molette sur ordinateur, zoom jusqu'à ×6.
Fermeture : croix, Échap (intercepté pour ne pas fermer aussi la fiche), bouton retour (entrée d'historique
`{photoViewer: true}`), sortie du plein écran, tap à côté de la photo.

Pastilles d'état (`.issue-chip-*`) : non modéré, refusé, sinon l'état de résolution (non résolu, pris en compte, en
cours, indiqué résolu, résolu), plus « J'ai fait ce signalement » ; la phrase longue (`status-*-long`) s'affiche
dessous quand elle existe.

Les boutons sans texte ont une description (`title`, et `aria-label` pour les lecteurs d'écran) traduite par
`data-i18n-attr`, affichée au survol : à garder pour tout nouveau bouton à icône seule.

---

## 3. Flux de données

### 3.1 Instances et catégories (`vigilo-config.js`)

- **Instances** : `https://raw.githubusercontent.com/jesuisundesdeux/vigilo-conf/main/main/citylist.json`. Une
  instance choisie est enregistrée **en entier** (JSON de l'entrée + `name`) dans `localStorage['vigilo-instance']` :
  si `api_path` ou `scope` changent dans vigilo-conf, les utilisateurs gardent l'ancienne copie jusqu'à ce qu'ils
  choisissent de nouveau le territoire.
- **Catégories** : `getCategories()` essaie `<api_path>/get_categories.php` (backend ≥ 0.0.23). Si la route échoue
  (404 sur un ancien backend, réseau) ou renvoie autre chose qu'un tableau non vide, il utilise la liste nationale
  `main/categorielist.json` de vigilo-conf. `formatCategories` produit :

  ```js
  { 8: { id: 8, name: "Absence d'aménagement", i18n: {en_US: "..."}, color: "...",
         disable: false, resolvable: true, custom: false }, ... }
  ```

  `i18n` est rempli à partir des champs `catname_<langue>` ; `resolvable` vient de `catresolvable`, sinon de
  `RESOLVABLE_CATEGORIES`. La promesse est gardée dans le module (`categoriesPromise`) ; elle est oubliée en cas
  d'échec pour permettre un nouvel essai.
- L'objet étant indexé par `catid` numérique, **l'ordre d'itération est l'ordre croissant des identifiants**, pas
  celui de la liste source (voir §12).

### 3.2 Requêtes et caches (`utils.request`)

- Cache **par URL** (`requests_cache`) pour les GET : une réponse réussie est resservie sans nouvelle requête, une
  requête en cours est partagée (les appelants suivants attendent la même réponse), un échec n'est pas gardé (nouvel
  essai au prochain appel). `request(options, true)` contourne le cache.
- Le cache vit **jusqu'au rechargement de la page**. `get_scope.php`, `citylist.json`, `acl.php` ne sont donc
  demandés qu'une fois.
- `vigilo-api.getIssues` a un second cache (`issue_cache`) qui garde le tableau **enrichi** : tous les modules
  partagent les mêmes objets. Une modification d'un objet (par exemple `issue.approved` dans `adminApprove`) est vue
  partout.

### 3.3 Observations (`getIssues`) et enrichissement

`getIssues()` sans argument demande **toutes** les observations du scope (`get_issues.php?scope=...`, sans `count`) :
le filtrage, la pagination et les statistiques se font ensuite dans le navigateur. `getIssues({token})` sert à ouvrir
une observation absente de la liste.

Chaque observation reçue (valeurs texte, voir `REST_API.md`) est complétée :

| Champ ajouté | Valeur |
|---|---|
| `lat_float`, `lon_float` | `parseFloat` de `coordinates_lat` / `coordinates_lon` |
| `status`, `approved` | convertis en entiers |
| `color` | `catcolor` de la catégorie, sinon `#9e9e9e` |
| `resolvable` | `resolvable` de la catégorie, sinon `false` |
| `date_obj` | `new Date(time * 1000)` |
| `img_thumb_panel`, `img_panel` | `generate_panel.php?s=150&token=` et `s=800` : photo pixelisée tant que non approuvée |
| `img`, `img_thumb` | clé de modérateur enregistrée (en mode modération ou non) : `get_photo.php?token=&key=<clé>` (une clé refusée retombe sur le panneau pixelisé, `data-fallback`) ; observation approuvée : `get_photo.php?token=` ; observation de l'auteur (son `secretid` connu) : `img_panel` / `img_thumb_panel` avec `&secretid=` (non pixelisée par `generate_panel.php`) ; sinon `img_panel` / `img_thumb_panel` |
| `permLink` | `<protocole>//<hôte>/?token=<token>&instance=<nom>` |

### 3.4 Filtres (`dataManager.filterIssues`)

| Clé | Valeurs | Règle |
|---|---|---|
| `dow` | `worked`, `weekend` | jour de `date_obj` dans lun.–ven. / sam.–dim. |
| `hour` | `morning`, `afternoon`, `night` | 6–12 h, 13–19 h, 20–5 h |
| `categories` | identifiants (chaînes) | `String(issue.categorie)` dans la liste |
| `cities` | noms | `cityname` (insensible à la casse) dans la liste ; observation sans `cityname` exclue si la liste n'est pas vide |
| `onlyme` | booléen | `secretid` connu localement |
| `status` | valeurs de `issueStatus` | |
| `comment` | texte | contenu dans `comment` (insensible à la casse) ; **pas** dans `explanation` |
| `age` | `1d`, `7d`, `1m`, `2m`, `3m`, `6m`, `1y`, `2y`, `all` | `date_obj >= periodStart(age)` |

Une liste vide signifie « pas de filtre ». Le flux complet :

```
#modal-filters (fermeture) → readFilters() → dataManager.setFilter()
  → 'filterchange' → app.js : list.cleanIssues(), map.cleanIssues(),
                              list.displayIssues(30), map.displayIssues(true)
```

Les statistiques ne tiennent **pas** compte des filtres. La mini-carte et `centerOnIssue` utilisent les
observations filtrées (`dataManager.getData()`), `viewIssue`, `startForm` et le formulaire de résolution toutes les
observations (`vigilo.getIssues()`).

### 3.5 Images et replis

`main.js` écoute les erreurs d'image en phase de capture sur `document` :

1. si l'image a un `data-fallback` différent de son `src`, elle passe sur ce repli (la photo pixelisée de
   `generate_panel.php`) ;
2. sinon, si elle a un `data-fallback` ou la classe `issue-photo`, elle prend `src/img/photo-missing.svg` et la classe
   `photo-missing` (l'attribut `data-photo-missing` évite une boucle).

Les cartes, la fiche et les vignettes de résolution utilisent ce mécanisme ; toute nouvelle image d'observation doit
porter un `data-fallback`.

### 3.6 Fiche d'une observation

`viewIssue(token)` → `issueDetail(issue)` → `#modal-issue`. Ensuite, sans bloquer l'ouverture : mini-carte
(`issue-minimap.js`) et recherche Panoramax ; le bouton « Voir avec Panoramax » affiche un indicateur de chargement
puis est activé, ou la ligne est retirée s'il n'y a pas de photo à proximité. L'URL de la page devient le `permLink`
de l'observation : un rechargement rouvre la même fiche.

### 3.7 Liste et carte

- **Liste** : 30 cartes au démarrage, 30 de plus à chaque arrivée en bas de page. Les cartes squelettes de
  `spinner.html` sont retirées au premier affichage.
- **Carte** : toutes les observations filtrées sont dessinées d'un coup (pas de regroupement). La première fois que
  l'onglet Carte s'affiche, `focus()` cadre la vue (la carte était cachée lors du premier `displayIssues()`).

---

## 4. Formulaire d'envoi d'une observation

Gabarit : `src/html/form.html`, dans `#modal-form` (fenêtre plein écran). Code : `src/js/form.js`.

### 4.1 Initialisation (`form.init()`)

- Remplit `#issue-cat` avec les catégories non désactivées (toutes en mode modération), dans l'ordre des `catid`.
- `initRelatedIssues()` : boutons de distance et filtres des observations proposées dans une résolution (§4.5).
- Ordinateur (`!WE_ARE_ON_A_MOBILE`) : `M.Timepicker` sur `#issue-time`, `M.FormSelect` sur `#issue-cat`, affichage
  de l'indication « coller une image ». Mobile : bouton « Prendre une photo » (`<input capture="environment">`),
  `<select>` natif, champs `type="date"` et `type="time"` natifs.

### 4.2 Ouverture (`window.startForm(token)`)

Appelé par le bouton flottant `+` (`issues.html`) sans argument, ou par le bouton « modifier » d'un modérateur avec
un jeton. `clearForm()` réinitialise le formulaire : champs, jeton caché, photo et éditeur, position, observations
résolues, liste des catégories (et recrée le `M.Datepicker` sur ordinateur, avec les réglages de la clé `datepicker`
de la traduction), la fenêtre s'ouvre, puis `initFormMap()` crée la carte au premier appel.

Le bouton **Tout effacer** (`#form-clear`, pied de la fenêtre, seulement pour une nouvelle observation) appelle
`clearForm()` après confirmation et recadre la carte sur la zone de l'instance.

### 4.3 Photo

Trois sources, toutes vers `loadPicture(file, fromCamera, notFromMainInput)` :

| Source | `fromCamera` | Champ obligatoire `#issue-picture` |
|---|---|---|
| sélection de fichier (`#issue-picture`) | non | rempli |
| bouton « Prendre une photo » (mobile, attribut `capture`) | oui | rendu facultatif |
| collage (`paste` sur `document`, fenêtre ouverte, desktop) | non | rendu facultatif |

Quatrième source, sans `loadPicture` : le bouton **Photo depuis une vue Panoramax** (`#panoramax-picture`) ouvre
`openPanoramaxCapture()` (voir `panoramax-capture.js`) autour de la position du formulaire si elle est placée. La photo
capturée passe par `renderImage()` (donc modifiable dans l'éditeur), le champ obligatoire devient facultatif, la
position est celle de la recherche (si le formulaire n'en a pas encore) et **la date et l'heure sont celles de la vue
Panoramax**.

`loadPicture` :

1. lit le fichier en data URL et appelle `renderImage()` : l'image est redessinée dans un `<canvas>` d'au plus
   `IMAGE_MAX_SIZE` (1500 px) de côté, placé dans `#picture-preview`, puis `ImageDrawable()` y ajoute l'outil de dessin ;
2. lit l'EXIF avec piexifjs (échoue sans gravité pour un PNG ou un HEIC) :
   - position GPS → `setFormMapPoint([lat, lon])` ; date et heure GPS (UTC) si présentes ;
   - sinon `DateTimeOriginal` (heure locale) ;
3. sans position : si la photo vient d'être prise (`fromCamera`, ou date EXIF à moins de 30 min,
   `RECENT_PHOTO_MS`), géolocalisation du téléphone (`formmap.locate`) et toast avec la précision ; sinon toast
   expliquant que la position a été retirée par le téléphone (`photo-location-removed`, si l'EXIF contient encore
   marque, modèle ou date) ou absente (`photo-no-location`) ;
4. sans date : date et heure courantes.

### 4.4 Position et adresse

- `initFormMap()` : carte `#form-map` cadrée sur les bornes du scope (`get_scope.php`), plein écran, fonds communs,
  marqueur déplaçable, géocodeur Nominatim limité à la zone (`viewbox` + `bounded=1`), bouton de localisation
  (`leaflet.locatecontrol`, icône Material). Un clic sur la carte, un déplacement du marqueur, une localisation ou un
  résultat de géocodage appellent `setFormMapPoint`.
- Une adresse saisie à la main dans `#issue-address` lance un géocodage tant qu'aucun point n'est placé.
- `setFormMapPoint(latlng, address)` :
  1. ne fait rien en mode résolution (une résolution n'a pas de position propre) ;
  2. refuse un point hors des bornes du scope (`alert`) ;
  3. place le marqueur (zoom 18) ;
  4. remplit l'adresse : celle du géocodeur si fournie, sinon géocodage inverse ; `addressFormat()` produit
     `"<rue>, <ville>"` (le backend en extrait la ville).

### 4.5 Mode résolution

Une résolution se crée **depuis une observation** : le bouton **Résoudre** de sa fiche (`issue-detail.js`, observation
publiée, **dans aucune résolution** (`status == 0` : le backend n'accepte qu'une résolution par observation et refuse
de valider une résolution dont une observation figure dans une autre), de catégorie « résoluble », backend ≥ 0.0.14)
appelle `window.startResolution(token)`, qui ferme
la fiche et ouvre le formulaire en mode résolution (`resolutionIssue` = l'observation) :

- `setFormMode(true)` : titre « Nouvelle résolution », `.onissueonly` masqués (position, catégorie, explication),
  `.onresolutiononly` affichés (carte « Observations résolues »), `#issue-cat` et `#issue-address` plus obligatoires ;
- photo (mêmes sources et même éditeur, Panoramax autour de l'observation), date et heure (maintenant), commentaire ;
- `setRelatedReference(issue)` (`related-issues.js`) propose les observations à résoudre.

#### `related-issues.js`

Même logique que les observations similaires (`samePlace()` de `similar-issues.js`) : observations publiées, dans
aucune résolution (`status == 0`), de catégorie « résoluble », à moins de la distance choisie **ou** à la même adresse, autour de l'observation de
départ, qui est sélectionnée (« cette observation »). Filtres modifiables : **catégorie** (celle de l'observation par
défaut, liste des catégories présentes avec leur nombre), **distance** (`RELATED_DISTANCES` : 50 m à 1 km, 300 m par
défaut comme `SIMILAR_DISTANCE`), **inclure la même adresse**. Les observations sélectionnées restent affichées quels
que soient les filtres ; une vignette se (dé)sélectionne au clic (ou Espace / Entrée), l'œil ouvre sa fiche.

| Export | Description |
|---|---|
| `initRelatedIssues()` | branche les filtres et les vignettes (appelée par `form.init()`) |
| `setRelatedReference(issue)` | observation de départ : calcule les candidates (jusqu'à 1 km ou même adresse) |
| `resetRelatedIssues()` | vide la sélection (`clearForm()`) |
| `selectedRelatedTokens()` | jetons sélectionnés, envoyés dans `tokenlist` |

À l'envoi, au moins une observation doit être sélectionnée (`solved-reports-required`).

### 4.6 Validation et envoi

Au `submit` du formulaire (validation HTML5 des champs `required` d'abord) :

1. date valide obligatoire (`date-required`), combinée avec l'heure ; `data.time` en millisecondes ;
2. observation : point placé obligatoire (`location-required`) ; champs `scope`, `coordinates_lat`,
   `coordinates_lon`, `explanation`, `categorie`, `address` ; résolution : `tokenlist` obligatoire ;
3. champs communs : `token` (vide, ou jeton en modification), `comment` (50 caractères max. côté champ), `version` ;
4. ouverture de `#modal-form-loader` (barre de progression 10 % → 50 % → 100 %) ;
5. `createIssue(data, key)` (clé seulement en mode modération) ou `createResolution(data)` ;
6. la réponse doit contenir un `token` ; hors mode modération, `secretid` est mémorisé
   (`setTokenSecretId`) : c'est ce qui permet ensuite le filtre « Seulement les miens », l'icône « je l'ai fait » et
   la suppression ;
7. le canvas est exporté en JPEG (qualité `JPEG_QUALITY = 0.9`) et envoyé par `addImage()` :
   - backend ≥ 0.0.16 : `add_image.php?token=&secretid=&method=base64[&type=resolution][&key=]`, champ `imagebin64`
     (la clé en mode modération : sans elle, le backend refuse de remplacer la photo d'une observation approuvée) ;
   - plus ancien : corps binaire brut ;
8. après 1 s, la page se recharge sur `?token=<nouveau jeton>` (fiche de l'observation ouverte) ; pour une
   résolution, sur la fiche de l'observation de départ.

En cas d'erreur à l'une des étapes, la fenêtre de progression affiche `errorCard(e)` et un bouton « Retour au
formulaire » qui la referme sans perdre la saisie.

### 4.7 Modification par un modérateur

`startForm(token)` pré-remplit le formulaire depuis l'observation : jeton caché `#issue-token`, photo (rechargée dans
le canvas depuis `issue.img`, avec `crossOrigin = "Anonymous"`), point et adresse, date et heure, catégorie, commentaire
et explication ; la photo n'est plus obligatoire. L'envoi suit le même
chemin : `create_issue.php?key=` avec le `token` existant (le backend modifie l'observation), puis la photo du canvas
est de nouveau envoyée par `add_image.php` avec le `secretid` renvoyé **et la clé** (`&key=`) : pour une observation
déjà approuvée, le backend répond sinon 403 `ALREADYAPPROVED`. L'observation est cherchée dans toutes les observations
(`vigilo.getIssues()`), pas seulement celles qui passent les filtres.

---

## 5. Mode modération

### 5.1 Clé et rôle (`admin.js`)

- La fenêtre `#modal-admin` (titre `moderator-become`, texte `moderator-text`, champ `#role_key`, boutons
  `#generate-key` et `#save-key`) s'ouvre par l'entrée de menu **« Accès modérateur »** (`#admin-status`,
  `moderator-access`, affichée quand aucune clé n'est enregistrée dans ce navigateur), ou après **10 clics** sur
  l'avatar Vigilo du menu latéral (`#mobile-menu a[href='#user']`, au premier clic si une clé est déjà enregistrée).
  La clé est propre au navigateur et au site (`localStorage`) : un autre appareil, un autre navigateur ou des données
  effacées n'en ont pas.
- « Enregistrer » stocke la clé (`localDataManager.setAdminKey`) et recharge la page. « Générer une clé » remplit le
  champ avec 40 caractères aléatoires (voir §12 : ce bouton n'a plus de sens avec les backends actuels).
- Au démarrage, s'il y a une clé : `acl.php?key=` donne le rôle.
  - `admin` ou `moderator` : entrée de menu `#admin-status` « Activer / Désactiver mode admin » (`moderator-enable` / `moderator-disable`). L'activation
    demande confirmation (`moderator-warning`) puis met `sessionStorage['vigilo-isAdmin'] = true` et recharge.
  - autre réponse (`false`, `citystaff`, erreur) : entrée « Presque modérateur » (`moderator-pending`) qui rouvre la
    fenêtre, et le mode est désactivé.
- Le mode modération dure le temps de la session de l'onglet (`sessionStorage`) ; la clé, elle, est permanente
  (`localStorage`).

### 5.2 Effets du mode modération

| Où | Effet |
|---|---|
| `admin.js` | bannière `#admin-banner` sous la barre du haut (« Mode modération activé », lien pour le désactiver) et classe `admin-mode` sur `<html>` (onglets et carte décalés de la hauteur de la bannière, `main.scss`) ; `window.adminApprove` défini |
| `vigilo-api.getIssues` | `img` / `img_thumb` = photo originale `get_photo.php?...&key=` (dès qu'une clé est enregistrée) |
| `issue-filter.js` | filtre par défaut `status = ['unapproved']` + toast |
| `issue-detail.js` | boutons Valider / Refuser, et dans le menu « ⋮ » : modifier, remettre à modérer, refuser |
| `form.js` | catégories désactivées proposées ; `create_issue.php?key=` (pas de limite anti-spam, modification possible) ; `secretid` non mémorisé |

### 5.3 `adminApprove(token, status)`

`status` : `'1'` approuver, `'0'` remettre à modérer, `'2'` refuser (ces deux derniers demandent confirmation). Après
`approve.php` (sans cache), l'observation en mémoire est mise à jour (`approved`), sa carte est réaffichée ou retirée
(`refreshIssueCard`), la carte Leaflet redessinée, la fiche fermée et un toast `moderation-done-<status>` affiché.
En cas d'échec : toast `moderation-failed`.

---

## 6. Statistiques

### 6.1 Contenu (`stats.html`, `stats.js`)

Calculées sur **toutes** les observations reçues (`vigilo.getIssues()`), sans les filtres de la liste, sur la
**période choisie** (`.stats-periods` : 30 jours, 12 mois, tout) : les chiffres clés comme les graphiques
(`renderPeriod()` appelle `renderKpis(selected, start)`).

| Bloc | Calcul |
|---|---|
| `#stats-kpi-total` | observations de la période (« sur les 30 derniers jours », « sur les 12 derniers mois », ou « depuis <mois année> » de la plus ancienne) |
| `#stats-kpi-trend` | écart avec la période précédente de même durée (▲ / ▼, nombre de la période précédente entre parenthèses) ; pour « Tout », moyenne par mois |
| `#stats-kpi-published` | observations approuvées de la période et leur part |
| `#stats-kpi-resolved` | part des observations approuvées de la période dont l'état est `resolved` (status 1), avec une jauge |
| `#stats-trend` | histogramme Chart.js (`type: 'bar'`, axe `timeseries`, adaptateur date-fns) : par jour (30 jours), par mois (12 mois), par mois ou par année (« Tout », par année si la plus ancienne observation a plus de 4 ans d'écart d'année civile) ; les périodes vides valent 0 |
| `#stats-categories` | classement des catégories (barres HTML), catégories inconnues sous la clé `stats-other` (« Autre ») |
| `#stats-status` | barre empilée et légende dans l'ordre `STATUS_ORDER` (les refusées, `unknow`, n'apparaissent pas) |
| `#stats-heatmap` | grille 7 jours (lundi d'abord) × 24 heures, 7 nuances (`HEAT`) |

Sélecteur de période (`.stats-periods button[data-period]`) : `30d`, `12m` (12 mois calendaires, mois courant
compris), `all`. Il relance `renderPeriod()` (les indicateurs du haut ne changent pas). Une seule bulle d'aide
`.stats-tip` sert à tous les éléments `[data-tip]` (survol et focus clavier). Couleurs : constantes en tête de
`stats.js` (`ACCENT`, `STATUS_COLORS`, `HEAT`...).

Les textes produits par `stats.js` ne sont pas réécrits lors d'un changement de langue (seuls les éléments
`data-i18n` le sont).

### 6.2 Dans l'application

Le bloc `#stats` de `index.html` inclut `stats.html` ; il s'affiche par l'onglet « Statistiques » du menu latéral.
`stats.init()` est lancé au démarrage, même si l'onglet n'est jamais ouvert.

### 6.3 Mode intégré (`stats-iframe.html`)

- Utilisé par vigilo-website (`layouts/villes/instance.html`) :
  `<iframe src="https://app.vigilo.city/stats-iframe.html?instance=<nom>">`.
- La page ne contient que `stats.html` dans `<body class="stats-embed">` : fond transparent, pas de barre de
  défilement, titre masqué (`.stats-embed .stats-page` dans `theme.scss`).
- `reportHeight()` (si la page est dans un cadre et que `ResizeObserver` existe) envoie à la page parente
  `postMessage({type: 'vigilo-stats-height', height}, '*')` à chaque changement de hauteur de `.stats-page` ;
  `site.js` de vigilo-website ajuste la hauteur de l'iframe.
- Le même `VigiloApp.init()` s'exécute : `i18n.init()` (pas de `#modal-i18n`, donc toujours en français),
  `setInstance(?instance, true)`, `admin.init()`, `navs.init()`, `form.init()`, `stats.init()`. L'exécution
  s'interrompt ensuite sur `M.Tabs.getInstance($("#issues .tabs")).options` (élément absent : `TypeError`), erreur
  attrapée et affichée dans la console par `main.js`. Les statistiques, lancées avant, s'affichent quand même. Sans
  instance, l'erreur survient plus tôt (`#modal-zone` absent).

---

## 7. Traductions (i18n)

### 7.1 Fonctionnement (`i18n.js`)

- Langues : constante `LANGUAGES` (`fr_FR`, `en_US`), fichiers `src/i18n/<code>.json` chargés par
  `require("../i18n/" + i + ".json")` (webpack inclut tous les JSON du dossier).
- Avant `i18next.init`, les noms de catégories sont ajoutés comme clés `category-name-<catid>` (valeur de
  `catname_<langue>` si elle existe, sinon `catname`).
- `i18next.init({lng: 'fr_FR', resources})`, puis, si `#modal-i18n` existe, `setLang(localDataManager.getLang())`.
- `setLang(lang)` (global, appelé par les liens de `#modal-i18n`) : change la langue, la mémorise et appelle
  `update()`.
- `update()` parcourt le DOM :
  - `[data-i18n]` : `innerHTML = i18next.t(clé)` (le contenu HTML initial sert seulement avant le premier passage) ;
  - `[data-i18n-attr]` : objet JSON `{"attribut": "clé"}`, par exemple `data-i18n-attr='{"title": "close"}'` ;
  - `[data-i18n-date]` : date (`Date.toString()`) réaffichée avec `toLocaleString(<langue sans pays>)`.

Le HTML généré en JS doit donc **à la fois** contenir le texte traduit (`i18next.t(...)`) et l'attribut `data-i18n`
(pour être retraduit lors d'un changement de langue), comme dans `issue-card.js`.

### 7.2 Structure des fichiers

- Objet plat `clé → texte` (151 clés en français, 150 en anglais).
- Exception : `fr_FR.json` contient un objet `datepicker` (`firstDay`, `format`, `months`, `monthsShort`, `weekdays`,
  ...) passé tel quel à `M.Datepicker` ; en anglais, les valeurs par défaut de Materialize s'appliquent.
- Pluriels i18next : `filters-count`, `stats-count`, `stats-resolved-of` (suffixes `_one` / `_other`, appel avec
  `{count}`). `nearby-one` / `nearby-other` ne sont **pas** des pluriels i18next : la clé est choisie dans le code.
- Interpolation : `{{count}}`, `{{n}}`, `{{date}}`, `{{accuracy}}`...

### 7.3 Ajouter une clé ou une langue

- Clé : l'ajouter dans **les deux** fichiers en insérant une ligne (ne pas reformater), puis l'utiliser avec
  `data-i18n` / `data-i18n-attr` dans le HTML ou `i18next.t()` dans le JS.
- Langue : créer `src/i18n/<code>.json` avec les mêmes clés, ajouter l'entrée dans `LANGUAGES` (`i18n.js`). Les noms
  de catégories viendront de `catname_<code>` s'il existe dans la liste de catégories. Pour le sélecteur de date,
  ajouter un objet `datepicker`.

---

## 8. Styles

| Fichier | Contenu |
|---|---|
| `src/css/main.scss` | point d'entrée : polices locales (Inter, Material Icons), `theme-variables.scss`, Materialize (SCSS source), `materialize-custom.scss`, CSS de Leaflet et de ses extensions, `spinner.scss`, `image-drawable.scss`, règles de mise en page (onglets fixes, liste, formulaire, filtres), puis `theme.scss` en dernier |
| `theme-variables.scss` | variables `$vigilo-*` (jaune `#fdd835`, encre `#1f2328`, rayons, ombres) et surcharges des variables Materialize (`$primary-color`, `$button-raised-background`, `$font-stack`...) — importé **avant** Materialize |
| `materialize-custom.scss` | tailles des fenêtres `.modal.big` et `.modal.fullscreen`, `.row` en flex, `z-index` du menu |
| `theme.scss` | habillage de tous les composants, par sections commentées : barre du haut, onglets Liste/Carte, cartes, boutons flottants, fenêtres, fiche, filtres, formulaire, menu, statistiques (`.stats-*`, mode `.stats-embed`), toasts, contrôles Leaflet, mini-carte, bannière d'installation, Panoramax (bouton, visionneuse, fenêtre de capture `#modal-panoramax-capture`), squelettes de chargement |
| `dark.scss` | mode sombre : toutes les règles sous `html[data-theme="dark"]` (palette `$dark-*`), importé **après** `theme.scss` ; fonds de carte assombris par un `filter` sur `.leaflet-tile-pane` |
| `image-drawable.scss` | éditeur de photo plein écran (barres d'outils, couleurs) |
| `spinner.scss` | ancienne animation de chargement `.spinner` (n'est plus utilisée dans les gabarits) |
| `timedout-marker.scss` | transition d'opacité du viseur |

- Les styles de l'écran de chargement sont **en ligne** dans `index.html` (affichés avant le chargement du CSS).
- Les couleurs des statistiques sont dans `stats.js` (Chart.js et éléments créés en JS), dupliquées en partie dans
  les variables CSS `--stats-accent` / `--stats-track` de `theme.scss`.
- Les avertissements de dépréciation de Sass dus à Materialize sont masqués (`quietDeps`, `silenceDeprecations` dans
  `webpack.config.js`).
- Menu latéral : colonne flex, les versions (`#version`, `#version-server`) en bas grâce à `margin-top: auto`
  (elles étaient en position absolue et cachaient « Mode modération » sur les écrans peu hauts) ; vérifier le menu à
  390 × 667 après l'ajout d'une entrée.
- Vérifier tout changement à 1280 px et à 390 px de large, en thème clair **et** sombre : un nouveau composant
  aux couleurs fixes (`#fff`, `$vigilo-ink`...) a besoin de sa règle dans `dark.scss`.

---

## 9. Stockage local et paramètres d'URL

### 9.1 Stockage du navigateur

| Clé | Stockage | Contenu | Écrit par |
|---|---|---|---|
| `vigilo-instance` | `localStorage` | JSON de l'instance choisie (`api_path`, `scope`, `prod`, `country`, `name`) | `setInstance` (`vigilo-config.js`) ; lu aussi par le script en ligne de `index.html` |
| `vigilo-localdata` | `localStorage` | `{tokens: {<token>: <secretid>}, lang, adminKey}` | `localDataManager` |
| `vigilo-version` | `localStorage` | version de l'application | `localDataManager.setVersion`, jamais appelée |
| `vigilo-theme` | `localStorage` | `auto`, `light` ou `dark` | `theme.js` ; lu aussi par le script en ligne de `index.html` |
| `vigilo-install-dismissed` | `localStorage` | `"1"` si la bannière d'installation a été fermée ou l'application installée | `install.js` |
| `vigilo-isAdmin` | `sessionStorage` | `"true"` / `"false"` : mode modération actif | `localDataManager.setIsAdmin` |
| `vigilo-beta` | `sessionStorage` | `"true"` : instances de test visibles | `?beta` |
| `vigilo-dev` | `sessionStorage` | `"true"` : backend local | `?dev` |

Les `secretid` de `tokens` ne sont gardés que dans ce navigateur : les perdre (changement d'appareil, nettoyage)
retire à l'auteur la possibilité de supprimer ses observations.

### 9.2 Paramètres d'URL

| Paramètre | Lu par | Effet |
|---|---|---|
| `?instance=<nom>` | `app.js` | choisit et mémorise l'instance (nom = clé de `citylist.json`), sans recharger |
| `?token=<jeton>` | `app.js` | ouvre la fiche de l'observation ; réécrit par `viewIssue` (permalien) |
| `?comment=<texte>` | `dataManager.js` | filtre initial sur le commentaire (pour partager une recherche) |
| `?beta` | `app.js` | mode beta pour la session (instances `prod: false` visibles) |
| `?dev` | `app.js` | mode dev pour la session (si `?beta` absent) : seule l'instance `Dev` (`http://127.0.0.1`) est proposée, à choisir dans la liste ou avec `?instance=Dev` |
| `mobile` | `main.js` | toute chaîne de requête **contenant** `mobile` force l'interface mobile (test par `indexOf`) |

---

## 10. Construire, lancer, publier

### 10.1 Commandes

Node.js ≥ 22.15. `.npmrc` contient `ignore-scripts=true` (le `postinstall` de Materialize 1.2 casse `npm install`).

```sh
npm ci
npm run webpack        # construction dans dist/ (WEBPACK_MODE=production par défaut)
npm run webpack-dev    # construction en continu (--watch)
npm run server         # webpack serve : 0.0.0.0, port 80, dist/ en statique
docker compose up      # node:22, npm install + npm run server, port ${BIND} (.env : 0.0.0.0:80)
```

- Le port 80 de `devServer` demande des droits ; hors Docker, `npx webpack serve --port 8080` fonctionne.
- `WEBPACK_MODE=development` pour un bundle non minifié (c'est la valeur de `docker-compose.yml`).
- `docker-compose.buildprod.yml` construit seulement (`npm run webpack`).
- `PATH_PREFIX=/chemin` fixe le `publicPath` (sinon `auto` : URL relatives, le même build fonctionne à la racine et
  sous `/develop`). `.gitlab-ci.yml` est un reste d'une ancienne publication GitLab Pages (`PATH_PREFIX=/vigilo-ui`).

### 10.2 Vérifier un changement

Il n'y a pas de tests automatisés. Construire, servir `dist/` (`python3 -m http.server`), et piloter la page dans un
navigateur (Playwright par exemple) en définissant `localStorage['vigilo-instance']` (JSON d'une entrée de
`citylist.json` avec `name`), en simulant si besoin `citylist.json` et l'API. Contrôler : aucune erreur JavaScript,
affichage à 1280 et 390 px. Penser à `stats-iframe.html` si le changement touche `app.js`, `i18n.js` ou `stats.js`.

### 10.3 Publication

`.github/workflows/deploy.yml` :

- pull request : `npm ci` + `npm run webpack` (construction seulement) ;
- push sur `master` ou `develop` (ou lancement manuel) : les **deux** branches sont construites, `master/dist` devient
  la racine et `develop/dist` le dossier `/develop`, publiés sur la branche `gh-pages` (domaine `app.vigilo.city`,
  fichier `CNAME`) par `peaceiris/actions-gh-pages`.

Les noms de fichiers contiennent un hash : pas de problème de cache après un déploiement (seuls `index.html` et
`stats-iframe.html` gardent leur nom).

### 10.4 Version

`package.json` est la seule source (`npm --no-git-tag-version version patch|minor|major`). Elle apparaît dans le menu
(lien vers la release `v<version>` du dépôt), dans le champ `version` envoyé à `create_issue.php` et dans le gabarit
de ticket GitHub.

---

## 11. Recettes

### 11.1 Ajouter un filtre

1. `filters.html` : une `<section class="filter-group">` avec des `<input name="<nom>" value="...">` et, pour une
   liste à cocher, `data-toggle-group` et un `<a class="filter-toggle">` dans le titre ; textes en `data-i18n`.
2. `dataManager.js` : ajouter la clé dans `KEYS`, une valeur initiale dans le constructeur de `DataManager`, la règle
   dans `filterIssues` (liste vide = pas de filtre).
3. `issue-filter.js` : lire la valeur dans `readFilters()` (`checkedValues("<nom>")` pour des cases), la remettre à
   zéro dans le gestionnaire de `#filters-reset`, afficher les compteurs avec `addCount("<nom>", countBy(...))`.
4. Traductions dans les deux fichiers.

### 11.2 Utiliser un nouveau champ de l'API

1. Vérifier dans `vigilo-backend/doc/REST_API.md` la version qui l'introduit : sur une instance plus ancienne, le
   champ est absent.
2. Si un calcul est nécessaire, le faire dans la boucle d'enrichissement de `getIssues` (`vigilo-api.js`), avec une
   valeur par défaut.
3. L'afficher (`issue-detail.js`, `issue-card.js`) avec `escapeHtml(...)`, en masquant le bloc quand la valeur est
   absente.

### 11.3 Ajouter une traduction

Voir §7.3.

### 11.4 Ajouter une page (onglet du menu)

1. Gabarit `src/html/<page>.html`, inclus dans `index.html` dans `#content` :
   `<div id="<page>" class="container">${require('./<page>.html')}</div>`.
2. Entrée dans les onglets de `navs.html` : `<li class="tab col s12"><a href="#<page>">...<span
   data-i18n="...">...</span></a></li>` (Materialize affiche le bloc dont l'`id` correspond au `href`).
3. Module `src/js/<page>.js` avec `init()`, appelé depuis `VigiloApp.init()` ; si la page doit aussi fonctionner dans
   `stats-iframe.html`, tester la présence des éléments.
4. Styles dans `theme.scss` (nouvelle section).

### 11.5 Utiliser une nouvelle route du backend avec repli

Deux motifs existent dans le code :

- **Essai puis repli** (comme `getCategories`) : appeler la route ; en cas d'échec (404 sur un ancien backend) ou de
  réponse inattendue, revenir à l'ancien comportement.

  ```js
  var nouvelle = request(baseUrl() + "/nouvelle_route.php").then((r) => {
      if (!Array.isArray(r)) { throw new Error("format"); }
      return r;
  });
  return nouvelle.catch(() => ancienComportement());
  ```

- **Selon la version** (comme `addImage`, le bouton Résoudre, le bouton de suppression) :

  ```js
  var scope = await vigilo.getScope();
  if (semver.gte(scope.backend_version, "0.0.24")) { ... } else { ... }
  ```

  `semver.gte` lève une exception si `backend_version` n'est pas une version valide : la protéger
  (`semver.valid(...)`) dans le nouveau code.

Dans les deux cas : ne jamais supposer la version du backend, ne pas casser l'affichage si la route manque, et
documenter la version minimale dans un commentaire.

---

## 12. Pièges connus et dette technique

### 12.1 Couplages et globales

- **Fonctions globales** appelées depuis des attributs `onclick` de HTML généré : `viewIssue`, `centerOnIssue`,
  `startForm`, `adminApprove` (définie seulement en mode modération), `deleteIssue`, `shareIssue`, `setLang`,
  `setInstance`. Les renommer impose de mettre à jour les gabarits ; tout jeton inséré dans un `onclick` doit passer
  par `safeToken`.
- Autres globales : `window.$`, `window.vigilo`, `window.issuesmap`, `window.WE_ARE_ON_A_MOBILE`, et `M`
  (Materialize) et `L` (Leaflet), utilisés sans import dans plusieurs modules (`admin.js`, `navs.js`, `issue-list.js`,
  `map-layers.js`, `circle-marker-dynamic.js`, `main.js`...). Ils fonctionnent parce que ces bibliothèques
  s'enregistrent sur `window` lorsqu'un autre module les importe.
- **Gestionnaires posés à l'évaluation du module** (`form.js`, `install.js`) : ils supposent que le DOM existe déjà
  (script `defer`).
- Les modules communiquent par sélecteurs jQuery partagés (`#modal-issue`, `#issues .cards-container`, attribut
  `onclick` des cartes...) et par un seul événement, `filterchange`.
- `$(dataManager)` est un objet JS utilisé comme cible d'événements jQuery.

### 12.2 Caches

- Les observations, le scope, `acl.php`, les catégories et la liste des instances sont chargés une fois par page :
  rien ne se met à jour sans rechargement. Les actions (envoi, suppression, changement d'instance, de clé ou de mode)
  rechargent la page ; seule la modération met à jour en place.
- `getIssues` télécharge toutes les observations du territoire : sur une grande instance, c'est le coût principal du
  démarrage. Le paramètre `offset` de `get_issues.php` est ignoré par le backend (pas de pagination serveur).

### 12.3 Compatibilité avec les anciens backends

- Points de repli existants : `get_categories.php` (0.0.23), `catresolvable` (liste en dur), `add_image.php` binaire
  avant 0.0.16, bouton Résoudre (0.0.14), suppression par l'auteur (0.0.17), filtre des communes (seulement si
  `cityname` et `scope.cities` existent).
- `semver.gte(scope.backend_version, ...)` dans `issue-detail.js` et `addImage()` lève une exception si
  la version est absente ou mal formée (`form.init()` affiche alors une carte d'erreur en tête de la liste).

### 12.4 Bogues et incohérences relevés (non corrigés)

| Sujet | Constat |
|---|---|
| Catégories avec `?instance=` | `i18n.init()` appelle `getCategories()` **avant** le traitement de `?instance=` ; la promesse mise en cache est celle de l'instance précédente (ou la liste nationale s'il n'y en avait pas). Avec un lien `?instance=` vers un autre territoire, et dans `stats-iframe.html` sur vigilo.city, les catégories propres (≥ 1000) de l'instance n'ont ni nom ni couleur, et les catégories désactivées/ajoutées sont fausses jusqu'au rechargement suivant |
| Modérateurs et `get_issues.php` | `getIssues` n'envoie jamais la clé : sans le réglage « Afficher les observations non modérées » de l'instance, un modérateur ne voit pas les observations à modérer (son filtre par défaut donne une liste vide), et les observations refusées (approved 2) ne sont jamais listées (les boutons prévus pour elles dans `issue-detail.js` sont inaccessibles) |
| Permalien | `permLink` utilise `location.host` + `/` : sous `/develop` (ou avec `PATH_PREFIX`), le lien de partage pointe vers la racine |
| Ordre des catégories | l'objet des catégories est itéré par `catid` croissant : l'ordre de la liste source est perdu (formulaire, filtres), les catégories propres (≥ 1000) se placent après « Autre » |
| Orientation de la photo | `renderImage` ne lit l'orientation EXIF que si `src` n'est pas une chaîne, ce qui n'arrive jamais : le code de rotation est mort (le navigateur applique déjà l'orientation) |
| Historique du dessin | `saveImage` appelle `slice(-queue_length)` sans garder le résultat : l'historique d'annulation n'est pas limité ; `startDraw` calcule l'échelle sur `$("canvas").last()` (dernier canvas de la page) au lieu du canvas de l'outil ; des `console.log` restent ; classe `disbabled` (faute de frappe) |
| Éléments filtrés | `centerOnIssue` cherche l'observation dans les données **filtrées** : `TypeError` si elle est masquée par les filtres (par exemple ouverte par `?token=`) |
| Erreur de la liste | une erreur dans `displayIssues` vide tout `#issues` (onglets, carte et boutons compris) |
| Liste vide | à chaque arrivée en bas de page avec une liste filtrée vide, un nouveau message « Aucun signalement » est ajouté |
| Textes non traduits | `alert` « La localisation doit se trouver dans la zone géographique choisie. » (`form.js`), noms des fonds de carte (`map-layers.js`), attributs `title` « Filtrer » et « Ajouter une observation » (`issues.html`), textes initiaux de l'écran de chargement |
| `?mobile` | le test `location.search.indexOf('mobile')` s'active aussi pour `?comment=automobile` |
| Clics sur l'avatar | le commentaire de `admin.js` parle de 15 clics, le code en attend 10 |
| `acl.php` | la clé n'est pas encodée (`encodeURIComponent`) dans l'URL, contrairement à `approve.php` |
| Code mort | `localDataManager.setVersion` et la clé `vigilo-version`, `spinner.scss`, variable `issues` inutilisée dans `issue-map.init`, second argument de `deleteIssue('<token>','2')` |
| Iframe | `VigiloApp.init()` s'arrête sur une `TypeError` dans `stats-iframe.html` (§6.3) ; elle y lance aussi des appels inutiles (`acl.php` si une clé est stockée, initialisation du formulaire) |

### 12.5 Fenêtre « Devenir modérateur »

Le texte `moderator-text` (« Insérez la clé fournie par un modérateur ... ou cliquez sur "générer" et transmettez
cette clé à un modérateur. Votre autorisation ... doit être validée par un modérateur. ») et le bouton
`#generate-key` décrivent un ancien fonctionnement où une clé créée par l'utilisateur était ensuite enregistrée par un
modérateur. Avec le backend actuel, les clés sont **générées uniquement par l'instance**, à la création d'un compte
ou par « Régénérer » dans la page **Comptes** de l'admin (`account_new_key()` dans `app/admin/inc/accounts.php`) ; une
clé générée dans le navigateur ne peut pas y être saisie et restera toujours « Presque modérateur ». Le libellé
`moderator-pending` suppose aussi cette attente de validation. Une mise à jour cohérente consisterait à retirer le
bouton et sa traduction, et à demander la clé fournie par l'administrateur de l'instance.

### 12.6 Sécurité

- Toute donnée de l'API ou de vigilo-conf insérée dans du HTML passe par `escapeHtml` (ou `.text()`), y compris les
  couleurs de catégories dans des attributs `style`.
- Hors mode modération, les photos non approuvées ne sont affichées que par `generate_panel.php` (pixelisées) ; ne
  pas remplacer `img` par `get_photo.php` pour elles.
- La clé de modération est stockée en clair dans `localStorage` et passée en paramètre d'URL (`get_photo.php`,
  `approve.php`, `create_issue.php`) : elle apparaît dans l'historique réseau et les journaux du serveur de
  l'instance.

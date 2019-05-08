# vigilo-webapp

[![Build Status](https://travis-ci.org/jesuisundesdeux/vigilo-webapp.svg?branch=master)](https://travis-ci.org/jesuisundesdeux/vigilo-webapp)


## Let's go!

```
docker-compose up
```

et aller sur http://127.0.0.1

Touche CTRL+C pour arrêter et `docker-compose down && sudo rm -rf node_modules dist package-lock.json ` pour nettoyer.

## Comment écrire ?

### Du HTML

A priori, il n'y a qu'une seule page, qui est `src/index.html`. Celle-ci ne fait appel qu'au javascript. Le CSS est chargé par le JS.

### Du JS

Le fichier principal est `src/js/main.js`. Ce fichier fait appel au CSS et aux sous-modules JS. Tout sous-module doit être inclus dans ce fichier par l'instruction `import ./submodule.js`.

Pour importer un librairie installée via npm, il suffit d'écrire `import NOM` sans le `./`.

### Du CSS

Le fichier principal est `src/css/main.scss`. Ce fichier peut contenir du CSS classique ou du SASS.
Pour faire appel à un sous-module, utiliser l'instruction `@import './submain.scss'`
Pour inclure un CSS d'un module installé avec npm, on ajoutera un tilde : `@import "~bootswatch/dist/yeti/variables"`

## Installer un module avec npm

Pour trouver un module, on peut se rendre sur npmjs.com.

Pour l'installer `docker-compose exec webpack npm install --save leaflet`

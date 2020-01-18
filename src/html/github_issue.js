import * as vigilo from '../js/vigilo-api';
import * as vigiloconfig from '../js/vigilo-config';

export default async function () {
    var scope = await vigilo.getScope();
    var scope_name = scope.display_name;
    var version_server = scope.backend_version;
    var app_version = vigiloconfig.VERSION_NUMBER;
    var body = `
## Bug

Indiquez ici le comportement anormal

## Navigateur

${navigator.userAgent}

## Zone géographique

${scope_name}

## Version

- Webapp : ${app_version}
- Serveur : ${version_server}

`
    return encodeURIComponent(body);
}
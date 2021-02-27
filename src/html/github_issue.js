import i18next from 'i18next';
import * as vigilo from '../js/vigilo-api';
import * as vigiloconfig from '../js/vigilo-config';

export default async function () {
    var scope = await vigilo.getScope();
    var scope_name = scope.display_name;
    var version_server = scope.backend_version;
    var app_version = vigiloconfig.VERSION_NUMBER;
    var body = `
## ${i18next.t("issue-bug")}

> ${i18next.t("issue-bug-hint")}

## ${i18next.t("issue-navigator")}

${navigator.userAgent}

## ${i18next.t("zone-geo")}

${scope_name}

## ${i18next.t("app-version")} ${app_version}

## ${i18next.t("server-version")} ${version_server}

`
    return encodeURIComponent(body);
}
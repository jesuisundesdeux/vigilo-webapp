import * as vigilo from './vigilo-api';

export async function init() {
    M.Sidenav.init($("#mobile-menu"));
    M.Tabs.init($("#mobile-menu .tabs"), {
        onShow: function () {
            M.Sidenav.getInstance($("#mobile-menu")).close()
        }
    });
    var version = (await vigilo.getScope()).backend_version
    $("li#version-server a").append(version)
    $("li#version-server a").attr("href", $("li#version-server a").attr("href")+version)
}

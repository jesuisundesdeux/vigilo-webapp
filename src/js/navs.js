import * as vigilo from './vigilo-api';
import * as vigiloconfig from './vigilo-config';
import * as install from './install';
import { instancePageUrl } from './utils';

export async function init() {
    M.Sidenav.init($("#mobile-menu"));
    M.Tabs.init($("#mobile-menu .tabs"), {
        onShow: function (el) {
            M.Sidenav.getInstance($("#mobile-menu")).close()
        }
    });
    install.init();
    // Page of the territory on vigilo.city (stable alias by instance name, see vigilo-website)
    var instance = vigiloconfig.getInstance();
    if (instance && instance.name) {
        $("#instance-page").attr("href", instancePageUrl(instance.name)).parent().removeClass("hide");
    }
    var version = (await vigilo.getScope()).backend_version
    $("li#version-server a").append(version)
    $("li#version-server a").attr("href", $("li#version-server a").attr("href")+version)
}

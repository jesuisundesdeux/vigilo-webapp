import {request} from './utils';
import localDataManager from './localDataManager';

const CONF_URL="https://raw.githubusercontent.com/jesuisundesdeux/vigilo-conf/main/main";
const RESOLVABLE_CATEGORIES=[2,3,4,5,6,7,8,11,100]

// Optional config.json next to index.html (closed set of instances, e.g. vigilo-demo):
// {"conf_url": "<folder of citylist.json and categorielist.json>"}
var appConfig = {};
export async function loadAppConfig() {
    try {
        var response = await fetch("config.json", { cache: "no-store" });
        var data = response.ok ? await response.json() : null;
        if (data && typeof data.conf_url == "string" && data.conf_url !== "") {
            appConfig = { conf_url: new URL(data.conf_url, window.location.href).href.replace(/\/+$/, "") };
        }
    } catch (e) {
        // no config.json (app.vigilo.city): vigilo-conf
    }
    return appConfig;
}

// Instances and categories of a closed set of instances instead of vigilo-conf
export function isClosed() {
    return appConfig.conf_url !== undefined;
}

function confUrl(file) {
    return (isClosed() ? appConfig.conf_url : CONF_URL) + "/" + file;
}

export async function getInstances(all){
    if (localDataManager.isDev()) {
      var scopes = []
      scopes.push({ 
        api_path: "http://127.0.0.1", 
        country: "France", 
        prod: "true", 
        scope: "XX_dev", 
        name: "Dev"});
    }
    else {
      var scopes = await request(confUrl("citylist.json"));
      scopes = Object.entries(scopes).map((item)=>{
          item[1].name = item[0];
          return item[1]
      })

    
      if (!localDataManager.isBeta() && !isClosed() && all == undefined){
          scopes = scopes.filter((item)=>item.prod)
      }
      // Instances added by hand in this browser (not in a closed set of instances)
      if (!isClosed()) {
          scopes = scopes.concat(getCustomInstances())
      }
    }
    return scopes

}

/*
 * Custom instances: not listed in vigilo-conf, added in this browser ("Instance personnalisée")
 * and kept in localStorage. Same fields as citylist.json, plus custom: true.
 */
const CUSTOM_INSTANCES_KEY = 'vigilo-custom-instances';

export function getCustomInstances() {
    try {
        var list = JSON.parse(localStorage.getItem(CUSTOM_INSTANCES_KEY));
        return Array.isArray(list) ? list.filter((item) => item && typeof item.name == "string" && item.name !== ""
            && typeof item.api_path == "string" && typeof item.scope == "string") : [];
    } catch (e) {
        return [];
    }
}

function saveCustomInstances(list) {
    localStorage.setItem(CUSTOM_INSTANCES_KEY, JSON.stringify(list));
}

// Address typed by the user -> api_path (scheme://host/path, without a file, query or final "/")
export function normalizeApiPath(value) {
    var text = String(value || "").trim();
    if (text === "") {
        return null;
    }
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) {
        text = "https://" + text;
    }
    try {
        var url = new URL(text);
    } catch (e) {
        return null;
    }
    if (url.protocol != "https:" && url.protocol != "http:") {
        return null;
    }
    // Address of a page of the instance (get_scope.php, admin/…) accepted: its folder
    var path = url.pathname.replace(/\/admin(\/.*)?$/, "").replace(/\/[^\/]*\.php$/, "").replace(/\/+$/, "");
    return url.origin + path;
}

/*
 * Checks the instance (get_scope.php of the scope) and keeps it. Returns the instance, or throws an
 * Error whose message is an i18n key.
 */
export async function addCustomInstance(address, scope, name) {
    var api_path = normalizeApiPath(address);
    scope = String(scope || "").trim();
    if (api_path === null) {
        throw new Error("custom-instance-error-url");
    }
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(scope)) {
        throw new Error("custom-instance-error-scope");
    }
    // An https page cannot call an http instance (mixed content)
    if (window.location.protocol == "https:" && api_path.indexOf("http:") === 0) {
        throw new Error("custom-instance-error-https");
    }
    var data = null;
    try {
        var response = await fetch(api_path + "/get_scope.php?scope=" + encodeURIComponent(scope), { cache: "no-store" });
        data = await response.json();
        if (response.status == 404) {
            throw new Error("custom-instance-error-unknown-scope");
        }
    } catch (e) {
        throw new Error(e.message == "custom-instance-error-unknown-scope" ? e.message : "custom-instance-error-unreachable");
    }
    if (!data || data.coordinate_lat_min === undefined) {
        throw new Error("custom-instance-error-unreachable");
    }
    name = String(name || "").trim() || String(data.display_name || "").trim() || scope;
    name = name.slice(0, 80);
    var listed = await getInstances(true);
    if (listed.some((item) => !item.custom && item.name == name)) {
        throw new Error("custom-instance-error-name");
    }
    var instance = { name: name, api_path: api_path, scope: scope, country: "", prod: true, custom: true };
    // Same name: the custom instance is replaced
    saveCustomInstances(getCustomInstances().filter((item) => item.name != name).concat([instance]));
    return instance;
}

export function removeCustomInstance(name) {
    saveCustomInstances(getCustomInstances().filter((item) => item.name != name));
    var current = getInstance();
    if (current && current.custom && current.name == name) {
        localStorage.removeItem('vigilo-instance');
    }
}

// Categories of the instance (backend >= 0.0.23: national list minus the ones disabled by the
// instance, plus its own). Older instances have no get_categories.php: national list of vigilo-conf.
function instanceCategoriesUrl() {
    var instance = getInstance();
    if (instance == null || !instance.api_path) {
        return null;
    }
    return decodeURIComponent(instance.api_path) + "/get_categories.php";
}

function formatCategories(cat) {
    let toreturn = {}
    for (var i in cat) {
        if (cat[i].catdisable !== true) {
           cat[i].catdisable = false;
        }
        cat[i].i18n = [];
        for (var j in cat[i]) {
            if (j.startsWith("catname_")){
                cat[i].i18n[j.replace("catname_", "")] = cat[i][j];
            }
        }
        toreturn[cat[i].catid] = {
            id: cat[i].catid,
            name: cat[i].catname,
            i18n: cat [i].i18n,
            color: cat[i].catcolor,
            disable: cat[i].catdisable,
            // catresolvable may be missing from older lists: hardcoded list then
            resolvable: (cat[i].catresolvable !== undefined) ? cat[i].catresolvable === true : RESOLVABLE_CATEGORIES.includes(cat[i].catid),
            custom: cat[i].catcustom === true,
        };
    }
    return toreturn;
}

var categoriesPromise = null;
export function getCategories() {
    if (categoriesPromise !== null) {
        return categoriesPromise;
    }
    var url = instanceCategoriesUrl();
    var fromInstance = (url === null) ? Promise.reject() : request(url).then((cat) => {
        if (!Array.isArray(cat) || cat.length == 0) {
            throw new Error("no categories");
        }
        return cat;
    });
    categoriesPromise = fromInstance
        .catch(() => request(confUrl("categorielist.json")))
        .then(formatCategories)
        .catch((e) => {
            categoriesPromise = null;
            throw e;
        });
    return categoriesPromise;
};

var pkg= require('../../package.json');
export const VERSION = pkg.name+"-"+pkg.version;
export const VERSION_NUMBER = pkg.version;

export const IMAGE_MAX_SIZE=1500;

export function getInstance(){
    var instance = localStorage.getItem('vigilo-instance');
    if (instance == null){
        return instance
    } else {
        return JSON.parse(instance)
    }
}
async function setInstance(name, noreload){
    var instances = await getInstances(true)
    for (var i in instances){
        if (instances[i].name == name){
            localStorage.setItem('vigilo-instance', JSON.stringify(instances[i]))
            break;
        }
    }
    if (noreload !== true){
        let searchParams = new URLSearchParams(window.location.search)
        if (searchParams.has('instance')){
            searchParams.delete('instance');
            window.location.search = '?' + searchParams.toString();
        } else {
            window.location.reload()
        }
        
    }
}

window.setInstance = setInstance;

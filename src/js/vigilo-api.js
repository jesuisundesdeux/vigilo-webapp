import * as vigiloconfig from './vigilo-config';
import localDataManager from './localDataManager';

import * as semver from 'semver';

const CONTENT_TYPE_X_WWW_FORM_URLENCODED = "application/x-www-form-urlencoded"
const CONTENT_TYPE_JPEG = "image/jpeg"

function baseUrl() {
    return decodeURIComponent(vigiloconfig.getInstance().api_path)
};

import {request} from './utils';
var issue_cache = {};
export function getIssues(options) {
    /**
     * - int GET['c'] : (Facultatif) : filtre selon catégorie
     * - int GET['t'] : (Facultatif) : filtre les observations du jour
     * - str GET['scope'] : (Facultatif) : filtre identifiant de la ville
     * - int GET['status'] : (Facultatif) : status de l'observation
     * - int GET['token'] : (Facultatif) : token de l'observation
     * - int GET['count'] : (Facultatif) : nombre d'observations à retourner
     * - int GET[''offset'] : (Facultatif) : Offset de la liste de resultat (GET['count'] obligatoire)
     */
    options = options || {};
    options.scope = vigiloconfig.getInstance().scope
    var url = baseUrl() + "/get_issues.php?" + Object.entries(options).map((kv) => {
        return kv[0] + "=" + encodeURIComponent(kv[1])
    }).join("&")

    if (issue_cache[url] !== undefined){
        return Promise.resolve(issue_cache[url]);
    }

    return new Promise((resolve, reject) => {
        vigiloconfig.getCategories()
            .then((cats) => {
                request(url)
                    .then((obj) => {
                        var data = obj.map((item) => {
                            item.lon_float = parseFloat(item.coordinates_lon);
                            item.lat_float = parseFloat(item.coordinates_lat);
                            item.status = parseInt(item.status);
                            item.approved = parseInt(item.approved);
                            item.color = cats[item.categorie].color;
                            item.resolvable = cats[item.categorie].resolvable;
                            item.date_obj = new Date(parseInt(item.time) * 1000);
                            item.mosaic = baseUrl() + "/mosaic.php?t=" + item.token;
                            item.img_thumb = baseUrl() + "/generate_panel.php?s=150&token=" + item.token;
                            item.img = baseUrl() + "/generate_panel.php?s=800&token=" + item.token;
                            if (localDataManager.isAdmin() && item.approved == 0){
                              item.img = baseUrl() + "/get_photo.php?token=" + item.token + "&key=" + localDataManager.getAdminKey();
                            }
                            item.map = baseUrl() + "/maps/" + item.token + "_zoom.jpg"
                            item.permLink = window.location.protocol + "//" + window.location.host + "/?token=" + item.token + "&instance=" + encodeURIComponent(vigiloconfig.getInstance().name);
                            return item
                        })
                        issue_cache[url] = data;
                        resolve(data)
                    })
                    .catch(reject)
            })
            .catch(reject);
    });
};

function generateToken() {
    const alphabet = "AZERTYUIOPQSDFGHJKLMWXCVBN1234567890";
    const length = 8;
    var token = "";
    for (var i = 0; i < length; i++) {
        token += alphabet[Math.floor(Math.random() * Math.floor(alphabet.length))];
    }
    return token;
}

export function createIssue(data, key) {
    if (data.token === undefined || data.token == ""){
      data.token = generateToken();
    }
    var opts = "";
    if (key !== undefined){
      opts = "?key="+key;
    }

    var options = {
        url: baseUrl() + "/create_issue.php"+opts,
        method: "POST",
        headers: {
            "Content-Type": CONTENT_TYPE_X_WWW_FORM_URLENCODED
        },
        body: data

    }
    return request(options)
}

export function createResolution(data) {
    if (data.token === undefined || data.token == ""){
      data.token = generateToken();
    }
    var opts = "";

    var options = {
        url: baseUrl() + "/create_resolution.php"+opts,
        method: "POST",
        headers: {
            "Content-Type": CONTENT_TYPE_X_WWW_FORM_URLENCODED
        },
        body: data

    }
    return request(options)
}

export async function addImage(token, secretId, data, isResolution) {
    var scope = await getScope();
    if (semver.gte( scope.backend_version ,"0.0.16")) {
        return _addImage_after_0_0_16(token, secretId, data, isResolution);
    } else {
        return _addImage_before_0_0_16(token, secretId, data, isResolution);
    }
}

function _addImage_before_0_0_16(token, secretId, data, isResolution) {
    var b64 = atob(data);
    var array = [];
    for (var p = 0; p < b64.length; p++) {
      array[p] = b64.charCodeAt(p);
    }
    var u8array = new Uint8Array(array);

    var options = {
        url: baseUrl() + "/add_image.php?token=" + token + "&secretid=" + secretId+(isResolution?"&type=resolution":""),
        method: "POST",
        headers: {
            //"Content-Type": CONTENT_TYPE_JPEG
        },
        body: u8array.buffer

    }
    return request(options)
}

function _addImage_after_0_0_16(token, secretId, data, isResolution) {
    var options = {
        url: baseUrl() + "/add_image.php?token=" + token + "&secretid=" + secretId + "&method=base64"+(isResolution?"&type=resolution":""),
        method: "POST",
        headers: {
            "Content-Type": CONTENT_TYPE_X_WWW_FORM_URLENCODED
        },
        body: {
            imagebin64: data
        }

    }
    return request(options)
}


export function acl(key){
  return request(baseUrl() + "/acl.php?key=" + key)
}

export function approve(key, token, status){
  var options = {
    url: baseUrl() + "/approve.php?key=" + key + "&token=" + token + "&approved=" + status,
    }
    return request(options)
}

export function deleteIssue(token, secretId) {
    var options = {
      url: baseUrl() + "/delete.php?secretid=" + secretId + "&token=" + token,
      }
      return request(options)
  }
  

export function getScope(){
    var url = baseUrl() + "/get_scope.php?scope=" + vigiloconfig.getInstance().scope;
    return request(url);
}

import * as vigiloconfig from './vigilo-config';

const CONTENT_TYPE_X_WWW_FORM_URLENCODED = "application/x-www-form-urlencoded"
const CONTENT_TYPE_JPEG = "image/jpeg"

function baseUrl() {
    return vigiloconfig.getInstance().url
};

let requests_cache = {};
function request(options, nocache) {
    nocache = nocache || false;
    if (typeof options == "string") {
        options = { url: options }
    }
    options.method = options.method || "GET";
    options.headers = options.headers || {};
    options.url = "https://cors-anywhere.herokuapp.com/" + options.url;

    if (options.headers["Content-Type"] == CONTENT_TYPE_X_WWW_FORM_URLENCODED && typeof (options.body) != typeof ("")) {
        options.body = Object.entries(options.body).map(x => x[0] + "=" + encodeURIComponent(x[1])).join("&")
    }

    if (!nocache && options.method == "GET" && requests_cache[options.url] !== undefined) {
        return Promise.resolve(requests_cache[options.url]);
    } else {
        return (new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open(options.method, options.url);
            for (var i in options.headers) {
                xhr.setRequestHeader(i, options.headers[i]);
            }
            xhr.onload = () => resolve(xhr);
            xhr.onerror = () => reject(`HTTP Code: ${xhr.status} (${xhr.statusText})\n${xhr.responseText}`);
            xhr.send(options.body);
        })).then((xhr) => {
            if (xhr.status != 200) {
                return Promise.reject()
            }
            try {
                var response = JSON.parse(xhr.responseText)
                if (response.status !== undefined && response.status != 0) {
                    throw new Error('error parsing json');
                }
                requests_cache[options.url] = response;
                return Promise.resolve(response)
            } catch (e) {
                return Promise.reject(`HTTP Code: ${xhr.status} (${xhr.statusText})\n${xhr.responseText}`)
            }
        });
    }

};

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
    var url = baseUrl() + "/get_issues.php?" + Object.entries(options).map((kv) => {
        return kv[0] + "=" + encodeURIComponent(kv[1])
    }).join("&")

    return new Promise((resolve, reject) => {
        getCategories()
            .then((cats) => {
                request(url)
                    .then((obj) => {
                        resolve(obj.map((item) => {
                            item.lon_float = parseFloat(item.coordinates_lon);
                            item.lat_float = parseFloat(item.coordinates_lat);
                            item.approved_bool = item.approved == "1";
                            item.categorie_str = cats[item.categorie]
                            item.date_obj = new Date(parseInt(item.time) * 1000);
                            item.img_thumb = baseUrl() + "/generate_panel.php?s=150&token=" + item.token
                            item.img = baseUrl() + "/generate_panel.php?s=800&token=" + item.token
                            item.map = baseUrl() + "/maps/" + item.token + "_zoom.jpg"
                            return item
                        }))
                    })
                    .catch(reject)
            })
            .catch(reject);
    });
};

export function getCategories() {

    var url = baseUrl() + "/get_categories_list.php";
    return request(url)
        .then((cat) => {
            let toreturn = {}
            for (var i in cat) {
                toreturn[cat[i].catid] = cat[i].catname;
            }
            return toreturn;
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

export function createIssue(data) {
    data.token = generateToken();

    var options = {
        url: baseUrl() + "/create_issue.php",
        method: "POST",
        headers: {
            "Content-Type": CONTENT_TYPE_X_WWW_FORM_URLENCODED
        },
        body: data

    }
    return request(options)
}

export function addImage(token, secretId, data) {


        var options = {
            url: baseUrl() + "/add_image.php?token=" + token + "&secretid=" + secretId,
            method: "POST",
            headers: {
                "Content-Type": CONTENT_TYPE_JPEG
            },
            body: data
    
        }
    
        return request(options)

}

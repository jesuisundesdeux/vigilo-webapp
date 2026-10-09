const CONTENT_TYPE_X_WWW_FORM_URLENCODED = "application/x-www-form-urlencoded"
const STATUS_PENDING = "pending";
const STATUS_OK = "OK";
const STATUS_KO = "KO";
let requests_cache = {};

class Deferred {
    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.reject = reject
            this.resolve = resolve
        })
    }
}

function make_request(options) {

    requests_cache[options.url] = {
        status: STATUS_PENDING,
        listeners: []
    };


    return (new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(options.method, options.url);
        for (var i in options.headers) {
            xhr.setRequestHeader(i, options.headers[i]);
        }
        xhr.onload = () => resolve(xhr);
        xhr.onerror = () => {
            requests_cache[options.url].status = STATUS_KO;
            for (var i in requests_cache[options.url].listeners) {
                requests_cache[options.url].listeners[i].reject(`HTTP Code: ${xhr.status} (${xhr.statusText})\n${xhr.responseText}`);
            }
            reject(`HTTP Code: ${xhr.status} (${xhr.statusText})\n${xhr.responseText}`);
        }
        xhr.send(options.body);
    })).then((xhr) => {
        if (xhr.status != 200) {
            requests_cache[options.url].status = STATUS_KO;
            for (var i in requests_cache[options.url].listeners) {
                requests_cache[options.url].listeners[i].reject(`HTTP Code: ${xhr.status} (${xhr.statusText})\n${xhr.responseText}`);
            }
            return Promise.reject(`HTTP Code: ${xhr.status} (${xhr.statusText})\n${xhr.responseText}`)
        }
        try {
            var response = JSON.parse(xhr.responseText)
            if (response.status !== undefined && response.status != 0) {
                throw new Error('error parsing json');
            }
            requests_cache[options.url].status = STATUS_OK;
            requests_cache[options.url].response = response;
            for (var i in requests_cache[options.url].listeners) {
                requests_cache[options.url].listeners[i].resolve(response);
            }
            return Promise.resolve(response)
        } catch (e) {
            requests_cache[options.url].status = STATUS_KO;
            for (var i in requests_cache[options.url].listeners) {
                requests_cache[options.url].listeners[i].reject(`HTTP Code: ${xhr.status} (${xhr.statusText})\n${xhr.responseText}`);
            }
            return Promise.reject(`HTTP Code: ${xhr.status} (${xhr.statusText})\n${xhr.responseText}`)
        }
    });
}

export function escapeHtml(value) {
    if (value === undefined || value === null) {
        return "";
    }
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/**
 * Keep only characters allowed in an issue token, so it can be safely
 * embedded in an inline JS handler (e.g. onclick="viewIssue('...')").
 */
/** Distance in meters between two points (latitude / longitude in degrees) */
export function distance(lat1, lng1, lat2, lng2) {
    var rad = Math.PI / 180;
    var dla = (lat2 - lat1) * rad / 2;
    var dlo = (lng2 - lng1) * rad / 2;
    var a = Math.sin(dla) * Math.sin(dla) + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dlo) * Math.sin(dlo);
    return 6378137 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Address reduced to lowercase letters and digits, without accents (to compare two addresses) */
export function flatString(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function safeToken(token) {
    return String(token || "").replace(/[^A-Za-z0-9_-]/g, "");
}

export function randomToken(alphabet, length) {
    const values = new Uint32Array(length);
    window.crypto.getRandomValues(values);
    var token = "";
    for (var i = 0; i < length; i++) {
        token += alphabet[values[i] % alphabet.length];
    }
    return token;
}

export function request(options, nocache) {
    nocache = nocache || false;

    if (typeof options == "string") {
        options = { url: options }
    }
    options.method = options.method || "GET";
    options.headers = options.headers || {};

    if (options.headers["Content-Type"] == CONTENT_TYPE_X_WWW_FORM_URLENCODED && typeof (options.body) != typeof ("")) {
        options.body = Object.entries(options.body).map(x => x[0] + "=" + encodeURIComponent(x[1])).join("&")
    }


    if (!nocache && options.method == "GET" && requests_cache[options.url] !== undefined) {
        if (requests_cache[options.url].status == STATUS_OK) {
            return Promise.resolve(requests_cache[options.url].response);
        } else if (requests_cache[options.url].status == STATUS_PENDING) {
            var def = new Deferred();
            requests_cache[options.url].listeners.push(def);
            return def.promise;
        }
    }
    // No cache, or previous request failed: (re)try
    return make_request(options)

};

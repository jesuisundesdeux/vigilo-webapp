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
                requests_cache[options.url].listeners[i].reject();
            }
            return Promise.reject()
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
    } else {
        return make_request(options)
    }

};